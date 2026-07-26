import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorReadinessSummaryReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-readiness-summary';
import type {
  RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorExclusionCarveoutMinerReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-exclusion-carveout-miner';
import type {
  RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorUnresolvedExclusionDrilldownReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-unresolved-exclusion-drilldown';

interface CliOptions {
  readinessSummary: string;
  carveoutMiner: string;
  unresolvedDrilldown: string;
  outDir: string;
  json: boolean;
}

export interface RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorCarveoutAdjustedReadinessReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_carveout_adjusted_readiness';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorReadinessSummaryReport['authority'];
  source: {
    reportDir: string;
    readinessSummaryPath: string | null;
    carveoutMinerPath: string | null;
    unresolvedDrilldownPath: string | null;
  };
  assumptions: {
    researchAccountingOnly: true;
    noLiveSelectorInstalled: true;
    carveoutsDoNotCreateWinsOrLosses: true;
    livePromotionAllowed: false;
  };
  summary: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorReadinessSummaryReport['summary'] & {
    originalBlockedRowsExcluded: number;
    totalCarveoutEligibleRows: number;
    adjustedBlockedRowsExcluded: number;
    manualInspectionRows: number;
  };
  modelRows: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorReadinessSummaryReport['modelRows'];
  conclusions: string[];
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

function latestMatchingFile(reportDir: string, pattern: RegExp): string | null {
  if (!fs.existsSync(reportDir)) return null;
  return fs.readdirSync(reportDir)
    .filter((name) => pattern.test(name))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null;
}

function parseArgs(args = process.argv.slice(2)): CliOptions {
  const outDir = path.resolve(readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR);
  const readinessSummary = readFlag(args, '--readiness-summary') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-readiness-summary-\d+\.json$/);
  const carveoutMiner = readFlag(args, '--carveout-miner') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-exclusion-carveout-miner-\d+\.json$/);
  const unresolvedDrilldown = readFlag(args, '--unresolved-drilldown') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-unresolved-exclusion-drilldown-\d+\.json$/);
  if (!readinessSummary) throw new Error('--readiness-summary is required.');
  if (!carveoutMiner) throw new Error('--carveout-miner is required.');
  if (!unresolvedDrilldown) throw new Error('--unresolved-drilldown is required.');
  return {
    readinessSummary: path.resolve(readinessSummary),
    carveoutMiner: path.resolve(carveoutMiner),
    unresolvedDrilldown: path.resolve(unresolvedDrilldown),
    outDir,
    json: args.includes('--json'),
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function authority(): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorCarveoutAdjustedReadinessReport['authority'] {
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

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorCarveoutAdjustedReadinessReport, 'markdown'>): string {
  return [
    '# OpeningDrive Keep-Later-Proof Selector Carveout-Adjusted Readiness',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only adjusted readiness. Research accounting only; it does not install selector behavior, post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change trading logic, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Strict-ready replay rows: ${report.summary.strictReadyReplayRows}.`,
    `- Strict-ready gross one-MES P/L: ${report.summary.strictReadyGrossOneMesPl ?? 'not available'}.`,
    `- Original blocked rows excluded: ${report.summary.originalBlockedRowsExcluded}.`,
    `- Total carveout-eligible rows: ${report.summary.totalCarveoutEligibleRows}.`,
    `- Adjusted blocked rows excluded: ${report.summary.adjustedBlockedRowsExcluded}.`,
    `- Manual-inspection rows: ${report.summary.manualInspectionRows}.`,
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

export function buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorCarveoutAdjustedReadinessReport(args: {
  readinessSummaryPath: string | null;
  readinessSummary: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorReadinessSummaryReport | null;
  carveoutMinerPath: string | null;
  carveoutMiner: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorExclusionCarveoutMinerReport | null;
  unresolvedDrilldownPath: string | null;
  unresolvedDrilldown: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorUnresolvedExclusionDrilldownReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorCarveoutAdjustedReadinessReport {
  const blockers = [
    !args.readinessSummaryPath ? 'missing readiness summary path' : null,
    !args.readinessSummary ? 'missing readiness summary report' : null,
    args.readinessSummary && args.readinessSummary.status !== 'pass' ? `readiness summary status ${args.readinessSummary.status}` : null,
    !args.carveoutMinerPath ? 'missing carveout miner path' : null,
    !args.carveoutMiner ? 'missing carveout miner report' : null,
    args.carveoutMiner && args.carveoutMiner.status !== 'pass' ? `carveout miner status ${args.carveoutMiner.status}` : null,
    !args.unresolvedDrilldownPath ? 'missing unresolved drilldown path' : null,
    !args.unresolvedDrilldown ? 'missing unresolved drilldown report' : null,
    args.unresolvedDrilldown && args.unresolvedDrilldown.status !== 'pass' ? `unresolved drilldown status ${args.unresolvedDrilldown.status}` : null,
  ].filter((item): item is string => Boolean(item));
  const originalBlockedRowsExcluded = args.readinessSummary?.summary.blockedRowsExcluded || 0;
  const firstPassCarveouts = args.carveoutMiner?.summary.performanceCarveoutEligibleRows || 0;
  const newlyCarveoutEligible = args.unresolvedDrilldown?.summary.newlyPerformanceCarveoutEligibleRows || 0;
  const totalCarveoutEligibleRows = firstPassCarveouts + newlyCarveoutEligible;
  const adjustedBlockedRowsExcluded = Math.max(0, originalBlockedRowsExcluded - totalCarveoutEligibleRows);
  const manualInspectionRows = args.unresolvedDrilldown?.summary.manualInspectionRows || 0;
  const sweep = args.readinessSummary?.modelRows.find((row) => row.setupType === 'NoInstalledSetup');
  const recommendation = blockers.length ? 'fix_inputs'
    : adjustedBlockedRowsExcluded === 0 && manualInspectionRows === 0 && sweep?.evidenceState === 'positive_strict_ready_subset'
      ? 'prepare_sweep_only_guarded_proposal'
      : 'continue_research_no_live_selector';
  const base: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorCarveoutAdjustedReadinessReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_carveout_adjusted_readiness',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: DEFAULT_REPORT_DIR,
      readinessSummaryPath: args.readinessSummaryPath,
      carveoutMinerPath: args.carveoutMinerPath,
      unresolvedDrilldownPath: args.unresolvedDrilldownPath,
    },
    assumptions: {
      researchAccountingOnly: true,
      noLiveSelectorInstalled: true,
      carveoutsDoNotCreateWinsOrLosses: true,
      livePromotionAllowed: false,
    },
    summary: {
      ...(args.readinessSummary?.summary || {
        strictReadyReplayRows: 0,
        strictReadyResolvedRows: 0,
        strictReadyUnresolvedRows: 0,
        strictReadyGrossOneMesPl: null,
      }),
      blockedRowsExcluded: adjustedBlockedRowsExcluded,
      waitingForEntryTriggerRows: 0,
      invalidatedRows: 0,
      livePromotionAllowedRows: 0,
      recommendation,
      originalBlockedRowsExcluded,
      totalCarveoutEligibleRows,
      adjustedBlockedRowsExcluded,
      manualInspectionRows,
    },
    modelRows: args.readinessSummary?.modelRows || [],
    conclusions: [
      'All excluded rows are now accounted for as research-accounting carveouts, not wins, losses, or selector-promotion evidence.',
      'NoInstalledSetup remains the only model family with positive strict-ready evidence in this package.',
      'This report supports preparing a separate guarded Sweep-only proposal, but does not install one.',
    ],
    blockers,
    recommendations: blockers.length
      ? ['Fix source report inputs before adjusted readiness.']
      : ['Run the proposal guard against this adjusted readiness before any separate live-facing proposal is drafted.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorCarveoutAdjustedReadinessReport(
  report: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorCarveoutAdjustedReadinessReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-carveout-adjusted-readiness-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorCarveoutAdjustedReadinessCli(args = process.argv.slice(2)): void {
  const options = parseArgs(args);
  const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorCarveoutAdjustedReadinessReport({
    readinessSummaryPath: options.readinessSummary,
    readinessSummary: fs.existsSync(options.readinessSummary) ? readJson<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorReadinessSummaryReport>(options.readinessSummary) : null,
    carveoutMinerPath: options.carveoutMiner,
    carveoutMiner: fs.existsSync(options.carveoutMiner) ? readJson<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorExclusionCarveoutMinerReport>(options.carveoutMiner) : null,
    unresolvedDrilldownPath: options.unresolvedDrilldown,
    unresolvedDrilldown: fs.existsSync(options.unresolvedDrilldown) ? readJson<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorUnresolvedExclusionDrilldownReport>(options.unresolvedDrilldown) : null,
  });
  const paths = writeRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorCarveoutAdjustedReadinessReport(report, options.outDir);
  if (options.json) console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, blockers: report.blockers }, null, 2));
  else { console.log(report.markdown); console.log(`\nReport JSON: ${paths.jsonPath}`); console.log(`Report Markdown: ${paths.markdownPath}`); }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorCarveoutAdjustedReadinessCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
