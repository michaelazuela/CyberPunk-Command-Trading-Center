import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowComparisonReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-shadow-comparison';

interface CliOptions {
  shadowComparison: string;
  outDir: string;
  json: boolean;
}

type DrilldownDimension = 'selectorDecision' | 'direction' | 'sessionType' | 'shadowSelectedSetupType' | 'wouldChangePrimary';

interface DrilldownBucket {
  dimension: DrilldownDimension;
  value: string;
  rows: number;
  keepLaterSweepProofRows: number;
  preferReplacementRows: number;
  wouldChangePrimaryRows: number;
  selectedCanExecuteTrueRows: number;
  livePromotionAllowedRows: 0;
  scannerVisibleChangeAllowedRows: 0;
  entryStopTargetRiskDriftRows: 0;
  sampleSnapshotIds: string[];
}

export interface RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowDrilldownReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_shadow_drilldown';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: {
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
  };
  source: {
    shadowComparisonPath: string;
  };
  summary: {
    shadowRows: number;
    bucketRows: number;
    keepLaterSweepProofRows: number;
    preferReplacementRows: number;
    wouldChangePrimaryRows: number;
    selectedCanExecuteTrueRows: number;
    livePromotionAllowedRows: 0;
    scannerVisibleChangeAllowedRows: 0;
    entryStopTargetRiskDriftRows: 0;
    recommendation: 'ready_for_outcome_join' | 'generate_shadow_rows' | 'fix_inputs';
  };
  buckets: DrilldownBucket[];
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
  const shadowComparison = readFlag(args, '--shadow-comparison') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-shadow-comparison-\d+\.json$/);
  if (!shadowComparison) throw new Error('--shadow-comparison is required.');
  return {
    shadowComparison: path.resolve(shadowComparison),
    outDir,
    json: args.includes('--json'),
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function authority(): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowDrilldownReport['authority'] {
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

function bucketValue(row: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowComparisonReport['rows'][number], dimension: DrilldownDimension): string {
  if (dimension === 'wouldChangePrimary') return String(row.wouldChangePrimary);
  return String(row[dimension] ?? 'missing');
}

function summarizeBucket(args: {
  dimension: DrilldownDimension;
  value: string;
  rows: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowComparisonReport['rows'];
}): DrilldownBucket {
  const driftRows = args.rows.filter((row) =>
    !row.selectedEntryPreserved ||
    !row.selectedStopPreserved ||
    !row.selectedTargetsPreserved ||
    !row.selectedRiskPreserved
  ).length as 0;
  return {
    dimension: args.dimension,
    value: args.value,
    rows: args.rows.length,
    keepLaterSweepProofRows: args.rows.filter((row) => row.selectorDecision === 'keep_later_sweep_proof').length,
    preferReplacementRows: args.rows.filter((row) => row.selectorDecision === 'prefer_replacement').length,
    wouldChangePrimaryRows: args.rows.filter((row) => row.wouldChangePrimary).length,
    selectedCanExecuteTrueRows: args.rows.filter((row) => row.selectedCanExecute).length,
    livePromotionAllowedRows: args.rows.filter((row) => row.selectedLiveInstallAllowed).length as 0,
    scannerVisibleChangeAllowedRows: args.rows.filter((row) => row.selectedScannerVisibleChangeAllowed).length as 0,
    entryStopTargetRiskDriftRows: driftRows,
    sampleSnapshotIds: args.rows.slice(0, 5).map((row) => row.snapshotId),
  };
}

function buildBuckets(rows: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowComparisonReport['rows']): DrilldownBucket[] {
  const dimensions: DrilldownDimension[] = ['selectorDecision', 'direction', 'sessionType', 'shadowSelectedSetupType', 'wouldChangePrimary'];
  const buckets: DrilldownBucket[] = [];
  for (const dimension of dimensions) {
    const grouped = new Map<string, RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowComparisonReport['rows']>();
    for (const row of rows) {
      const value = bucketValue(row, dimension);
      grouped.set(value, [...(grouped.get(value) || []), row]);
    }
    for (const [value, groupRows] of grouped) {
      buckets.push(summarizeBucket({ dimension, value, rows: groupRows }));
    }
  }
  return buckets.sort((a, b) => a.dimension.localeCompare(b.dimension) || b.rows - a.rows || a.value.localeCompare(b.value));
}

function buildMarkdown(
  report: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowDrilldownReport, 'markdown'>,
): string {
  return [
    '# OpeningDrive Keep-Later-Proof Selector Shadow Drilldown',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only drilldown. It consumes a saved disabled shadow comparison report only. It does not install ranking, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Shadow rows: ${report.summary.shadowRows}.`,
    `- Bucket rows: ${report.summary.bucketRows}.`,
    `- Keep-later Sweep proof rows: ${report.summary.keepLaterSweepProofRows}.`,
    `- Prefer replacement rows: ${report.summary.preferReplacementRows}.`,
    `- Would-change-primary rows: ${report.summary.wouldChangePrimaryRows}.`,
    `- selectedCanExecute=true rows: ${report.summary.selectedCanExecuteTrueRows}.`,
    `- Live/scanner-visible rows: ${report.summary.livePromotionAllowedRows} / ${report.summary.scannerVisibleChangeAllowedRows}.`,
    `- Entry/stop/target/risk drift rows: ${report.summary.entryStopTargetRiskDriftRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Buckets',
    '| Dimension | Value | Rows | Keep Sweep | Prefer Replacement | Would Change Primary | canExecute True | Live/Scanner | Drift |',
    '|---|---|---:|---:|---:|---:|---:|---:|---:|',
    ...report.buckets.map((bucket) => `| ${bucket.dimension} | ${bucket.value} | ${bucket.rows} | ${bucket.keepLaterSweepProofRows} | ${bucket.preferReplacementRows} | ${bucket.wouldChangePrimaryRows} | ${bucket.selectedCanExecuteTrueRows} | ${bucket.livePromotionAllowedRows}/${bucket.scannerVisibleChangeAllowedRows} | ${bucket.entryStopTargetRiskDriftRows} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowDrilldownReport(args: {
  shadowComparisonPath: string;
  shadowComparison: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowComparisonReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowDrilldownReport {
  const rows = args.shadowComparison?.rows || [];
  const buckets = buildBuckets(rows);
  const livePromotionAllowedRows = rows.filter((row) => row.selectedLiveInstallAllowed).length as 0;
  const scannerVisibleChangeAllowedRows = rows.filter((row) => row.selectedScannerVisibleChangeAllowed).length as 0;
  const entryStopTargetRiskDriftRows = rows.filter((row) =>
    !row.selectedEntryPreserved ||
    !row.selectedStopPreserved ||
    !row.selectedTargetsPreserved ||
    !row.selectedRiskPreserved
  ).length as 0;
  const blockers = [
    !args.shadowComparison ? 'missing shadow comparison report' : null,
    args.shadowComparison && args.shadowComparison.status !== 'pass' ? `shadow comparison status ${args.shadowComparison.status}` : null,
    livePromotionAllowedRows !== 0 ? 'shadow rows allowed live promotion' : null,
    scannerVisibleChangeAllowedRows !== 0 ? 'shadow rows allowed scanner-visible change' : null,
    entryStopTargetRiskDriftRows !== 0 ? 'shadow rows changed entry/stop/target/risk values' : null,
  ].filter((item): item is string => Boolean(item));
  const recommendation = blockers.length
    ? 'fix_inputs'
    : rows.length
      ? 'ready_for_outcome_join'
      : 'generate_shadow_rows';
  const base: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowDrilldownReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_shadow_drilldown',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      shadowComparisonPath: args.shadowComparisonPath,
    },
    summary: {
      shadowRows: rows.length,
      bucketRows: buckets.length,
      keepLaterSweepProofRows: rows.filter((row) => row.selectorDecision === 'keep_later_sweep_proof').length,
      preferReplacementRows: rows.filter((row) => row.selectorDecision === 'prefer_replacement').length,
      wouldChangePrimaryRows: rows.filter((row) => row.wouldChangePrimary).length,
      selectedCanExecuteTrueRows: rows.filter((row) => row.selectedCanExecute).length,
      livePromotionAllowedRows,
      scannerVisibleChangeAllowedRows,
      entryStopTargetRiskDriftRows,
      recommendation,
    },
    buckets,
    blockers,
    recommendations: recommendation === 'ready_for_outcome_join'
      ? [
        'Join this disabled shadow drilldown to saved outcome artifacts next.',
        'Keep selector disabled; do not use drilldown buckets as scanner-visible ranking rules.',
      ]
      : recommendation === 'generate_shadow_rows'
        ? ['Regenerate the shadow comparison from saved scanner snapshots with collision rows.']
        : ['Fix the shadow comparison input before continuing.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowDrilldownReport(
  report: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowDrilldownReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-shadow-drilldown-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowDrilldownCli(args = process.argv.slice(2)): void {
  const options = parseArgs(args);
  const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowDrilldownReport({
    shadowComparisonPath: options.shadowComparison,
    shadowComparison: fs.existsSync(options.shadowComparison)
      ? readJson<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowComparisonReport>(options.shadowComparison)
      : null,
  });
  const paths = writeRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowDrilldownReport(report, options.outDir);
  if (options.json) console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, blockers: report.blockers }, null, 2));
  else { console.log(report.markdown); console.log(`\nReport JSON: ${paths.jsonPath}`); console.log(`Report Markdown: ${paths.markdownPath}`); }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowDrilldownCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
