import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  RawOhlcScannerArtifactOpeningDrivePriorityStructuralContextMinerReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-structural-context-miner';

interface CliOptions {
  structuralContextReports: string[];
  featureTag: string;
  outDir: string;
  json: boolean;
}

interface RollupRow {
  reportPath: string;
  tradeDates: string[];
  rows: number;
  priorityLossRows: number;
  priorityNonLossRows: number;
  featureRows: number;
  featurePriorityLossRows: number;
  featurePriorityNonLossRows: number;
  featurePriorityOneMesPl: number | null;
  featureConclusion: string | null;
}

export interface RawOhlcScannerArtifactOpeningDrivePriorityStructuralValidationRollupReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_structural_validation_rollup';
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
    structuralContextReports: string[];
    featureTag: string;
  };
  summary: {
    reports: number;
    totalRows: number;
    totalPriorityLossRows: number;
    totalPriorityNonLossRows: number;
    featureRows: number;
    featurePriorityLossRows: number;
    featurePriorityNonLossRows: number;
    featurePriorityOneMesPl: number | null;
    liveInitialRankFeatureRows: 0;
    livePromotionAllowedRows: 0;
    broadeningAllowedNow: false;
    recommendation: 'needs_more_unseen_negative_observations' | 'reject_structural_feature' | 'fix_inputs';
  };
  rows: RollupRow[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const DEFAULT_FEATURE = 'best_conditional_NoInstalledSetup';

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function splitPaths(value: string | null): string[] {
  return (value || '').split(',').map((item) => item.trim()).filter(Boolean);
}

function matchingReportPaths(pattern: RegExp): string[] {
  if (!fs.existsSync(DEFAULT_REPORT_DIR)) return [];
  return fs.readdirSync(DEFAULT_REPORT_DIR)
    .filter((file) => pattern.test(file))
    .map((file) => path.join(DEFAULT_REPORT_DIR, file))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
}

export function parseRawOhlcScannerArtifactOpeningDrivePriorityStructuralValidationRollupArgs(
  argv = process.argv.slice(2),
): CliOptions {
  const outDir = path.resolve(readFlag(argv, '--out-dir') || DEFAULT_REPORT_DIR);
  const reports = splitPaths(readFlag(argv, '--structural-context-reports')).map((item) => path.resolve(item));
  return {
    structuralContextReports: reports.length
      ? reports
      : matchingReportPaths(/^raw-ohlc-scanner-artifact-openingdrive-priority-structural-context-miner-\d+\.json$/).slice(0, 4),
    featureTag: readFlag(argv, '--feature-tag') || DEFAULT_FEATURE,
    outDir,
    json: argv.includes('--json'),
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function sum(values: Array<number | null>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? round(numeric.reduce((total, value) => total + value, 0)) : null;
}

function authority(): RawOhlcScannerArtifactOpeningDrivePriorityStructuralValidationRollupReport['authority'] {
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

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDrivePriorityStructuralValidationRollupReport, 'markdown'>): string {
  return [
    '# OpeningDrive Priority Structural Validation Rollup',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only rollup over saved structural-context miner reports. It does not run setupScanner, post Discord, write Supabase, read live bridge data, change scanner behavior, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Reports: ${report.summary.reports}.`,
    `- Feature: ${report.source.featureTag}.`,
    `- Total priority loss/non-loss rows: ${report.summary.totalPriorityLossRows}/${report.summary.totalPriorityNonLossRows}.`,
    `- Feature rows: ${report.summary.featureRows}.`,
    `- Feature priority loss/non-loss rows: ${report.summary.featurePriorityLossRows}/${report.summary.featurePriorityNonLossRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Rows',
    ...report.rows.map((row) => `- ${row.tradeDates.join(',') || 'unknown'}: rows ${row.rows}, losses ${row.priorityLossRows}, feature rows ${row.featureRows}, feature losses/non-losses ${row.featurePriorityLossRows}/${row.featurePriorityNonLossRows}, conclusion ${row.featureConclusion || 'none'}.`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDrivePriorityStructuralValidationRollupReport(args: {
  structuralContextReports: string[];
  loadedReports: RawOhlcScannerArtifactOpeningDrivePriorityStructuralContextMinerReport[];
  featureTag: string;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDrivePriorityStructuralValidationRollupReport {
  const rows = args.loadedReports.map((report, index) => {
    const feature = report.featureRows.find((row) => row.featureTag === args.featureTag) || null;
    return {
      reportPath: args.structuralContextReports[index],
      tradeDates: [...new Set(report.rows.map((row) => row.tradeDate))].sort(),
      rows: report.summary.dedupedRows,
      priorityLossRows: report.summary.priorityLossRows,
      priorityNonLossRows: report.summary.priorityNonLossRows,
      featureRows: feature?.rows || 0,
      featurePriorityLossRows: feature?.priorityLossRows || 0,
      featurePriorityNonLossRows: feature?.priorityNonLossRows || 0,
      featurePriorityOneMesPl: feature?.priorityOneMesPl ?? null,
      featureConclusion: feature?.conclusion || null,
    };
  });
  const blockers = [
    args.structuralContextReports.length === 0 ? 'no structural-context reports supplied' : null,
    args.loadedReports.some((report) => report.status !== 'pass') ? 'one or more structural-context reports did not pass' : null,
  ].filter((item): item is string => Boolean(item));
  const featurePriorityLossRows = rows.reduce((total, row) => total + row.featurePriorityLossRows, 0);
  const featurePriorityNonLossRows = rows.reduce((total, row) => total + row.featurePriorityNonLossRows, 0);
  const recommendation: RawOhlcScannerArtifactOpeningDrivePriorityStructuralValidationRollupReport['summary']['recommendation'] = blockers.length
    ? 'fix_inputs'
    : featurePriorityLossRows > 0 && featurePriorityNonLossRows === 0
      ? 'needs_more_unseen_negative_observations'
      : 'reject_structural_feature';
  const base: Omit<RawOhlcScannerArtifactOpeningDrivePriorityStructuralValidationRollupReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_structural_validation_rollup',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      structuralContextReports: args.structuralContextReports,
      featureTag: args.featureTag,
    },
    summary: {
      reports: args.loadedReports.length,
      totalRows: rows.reduce((total, row) => total + row.rows, 0),
      totalPriorityLossRows: rows.reduce((total, row) => total + row.priorityLossRows, 0),
      totalPriorityNonLossRows: rows.reduce((total, row) => total + row.priorityNonLossRows, 0),
      featureRows: rows.reduce((total, row) => total + row.featureRows, 0),
      featurePriorityLossRows,
      featurePriorityNonLossRows,
      featurePriorityOneMesPl: sum(rows.map((row) => row.featurePriorityOneMesPl)),
      liveInitialRankFeatureRows: 0,
      livePromotionAllowedRows: 0,
      broadeningAllowedNow: false,
      recommendation,
    },
    rows,
    blockers,
    recommendations: recommendation === 'needs_more_unseen_negative_observations'
      ? ['Keep the structural feature research-only. It has not false-rejected non-loss rows, but it needs more unseen negative observations before any scanner-visible change.']
      : recommendation === 'reject_structural_feature'
        ? ['Reject this structural feature for now; it appears on non-loss rows or does not catch losses.']
        : ['Fix structural-context report inputs before interpreting rollup output.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function runRawOhlcScannerArtifactOpeningDrivePriorityStructuralValidationRollupCli(
  options = parseRawOhlcScannerArtifactOpeningDrivePriorityStructuralValidationRollupArgs(),
): RawOhlcScannerArtifactOpeningDrivePriorityStructuralValidationRollupReport {
  const loadedReports = options.structuralContextReports.map((reportPath) =>
    readJson<RawOhlcScannerArtifactOpeningDrivePriorityStructuralContextMinerReport>(reportPath));
  const report = buildRawOhlcScannerArtifactOpeningDrivePriorityStructuralValidationRollupReport({
    structuralContextReports: options.structuralContextReports,
    loadedReports,
    featureTag: options.featureTag,
  });
  fs.mkdirSync(options.outDir, { recursive: true });
  const jsonPath = path.join(options.outDir, `raw-ohlc-scanner-artifact-openingdrive-priority-structural-validation-rollup-${Date.now()}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  if (options.json) {
    console.log(JSON.stringify({ status: report.status, jsonPath, summary: report.summary, rows: report.rows, blockers: report.blockers }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nSaved: ${jsonPath}`);
  }
  return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  runRawOhlcScannerArtifactOpeningDrivePriorityStructuralValidationRollupCli();
}
