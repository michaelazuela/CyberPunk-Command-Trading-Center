import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  RawOhlcScannerArtifactOpeningDrivePriorityNoLookaheadFeatureMinerReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-no-lookahead-feature-miner';

interface CliOptions {
  minerReports: string[];
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

type MinerRow = RawOhlcScannerArtifactOpeningDrivePriorityNoLookaheadFeatureMinerReport['rows'][number];

interface ValidationRow {
  featureTag: string;
  sourceRows: number;
  caughtUnderperformanceRows: number;
  falseRejectedPriorityBetterRows: number;
  priorityEqualRows: number;
  installedPriorityOneMesPl: number | null;
  fallbackOpeningDriveOneMesPl: number | null;
  simulatedDeltaVsInstalledPriority: number | null;
  liveInitialRankInstallableNow: false;
  livePromotionAllowedNow: false;
  decision: 'candidate_needs_fresh_validation' | 'reject_for_now';
}

export interface RawOhlcScannerArtifactOpeningDrivePriorityNoLookaheadFeatureValidationReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_no_lookahead_feature_validation';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: Authority;
  source: {
    minerReports: string[];
  };
  assumptions: {
    consumesSavedMinerReportsOnly: true;
    validatesResearchFeatureTagsOnly: true;
    noLiveScoringUsed: true;
    noSetupScannerRun: true;
    noDiscordOrSupabaseSideEffects: true;
    livePromotionAllowed: false;
  };
  summary: {
    minerReports: number;
    eventRows: number;
    candidateFeatureRows: number;
    validationPassRows: number;
    validationRejectRows: number;
    liveInitialRankFeatureRows: 0;
    livePromotionAllowedRows: 0;
    broadeningAllowedNow: false;
    recommendation: 'queue_fresh_artifact_validation' | 'continue_observation' | 'fix_inputs';
  };
  validationRows: ValidationRow[];
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

function splitPaths(value: string | null): string[] {
  return (value || '').split(',').map((item) => item.trim()).filter(Boolean);
}

function latestReportPaths(prefix: string): string[] {
  if (!fs.existsSync(DEFAULT_REPORT_DIR)) return [];
  return fs.readdirSync(DEFAULT_REPORT_DIR)
    .filter((file) => file.startsWith(prefix) && file.endsWith('.json'))
    .map((file) => path.join(DEFAULT_REPORT_DIR, file))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)
    .slice(0, 1);
}

export function parseRawOhlcScannerArtifactOpeningDrivePriorityNoLookaheadFeatureValidationArgs(
  argv = process.argv.slice(2),
): CliOptions {
  return {
    minerReports: splitPaths(readFlag(argv, '--miner-reports')).map((item) => path.resolve(item)),
    outDir: path.resolve(readFlag(argv, '--out-dir') || DEFAULT_REPORT_DIR),
    json: argv.includes('--json'),
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

function sum(values: Array<number | null>): number | null {
  if (values.some((value) => typeof value !== 'number')) return null;
  return values.reduce((total, value) => total + (value || 0), 0);
}

function buildValidationRows(reports: RawOhlcScannerArtifactOpeningDrivePriorityNoLookaheadFeatureMinerReport[]): ValidationRow[] {
  const rows = reports.flatMap((report) => report.rows);
  const featureTags = [...new Set(reports.flatMap((report) => report.featureRows)
    .filter((feature) => feature.separatorType === 'candidate_no_lookahead')
    .map((feature) => feature.featureTag))].sort();

  return featureTags.map((featureTag) => {
    const matching = rows.filter((row) => row.immediateFeatureTags.includes(featureTag));
    const installedPriorityOneMesPl = sum(matching.map((row) => row.priorityOneMesPl));
    const fallbackOpeningDriveOneMesPl = sum(matching.map((row) => row.openingDriveOneMesPl));
    const simulatedDeltaVsInstalledPriority = typeof installedPriorityOneMesPl === 'number' && typeof fallbackOpeningDriveOneMesPl === 'number'
      ? fallbackOpeningDriveOneMesPl - installedPriorityOneMesPl
      : null;
    const caughtUnderperformanceRows = matching.filter((row) => row.priorityUnderperformed).length;
    const falseRejectedPriorityBetterRows = matching.filter((row) => row.priorityBetter).length;
    const priorityEqualRows = matching.length - caughtUnderperformanceRows - falseRejectedPriorityBetterRows;
    const decision: ValidationRow['decision'] = caughtUnderperformanceRows > 0 && falseRejectedPriorityBetterRows === 0
      ? 'candidate_needs_fresh_validation'
      : 'reject_for_now';
    return {
      featureTag,
      sourceRows: matching.length,
      caughtUnderperformanceRows,
      falseRejectedPriorityBetterRows,
      priorityEqualRows,
      installedPriorityOneMesPl,
      fallbackOpeningDriveOneMesPl,
      simulatedDeltaVsInstalledPriority,
      liveInitialRankInstallableNow: false as const,
      livePromotionAllowedNow: false as const,
      decision,
    };
  }).sort((a, b) => b.caughtUnderperformanceRows - a.caughtUnderperformanceRows || a.falseRejectedPriorityBetterRows - b.falseRejectedPriorityBetterRows || a.featureTag.localeCompare(b.featureTag));
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDrivePriorityNoLookaheadFeatureValidationReport, 'markdown'>): string {
  return [
    '# OpeningDrive Priority No-Lookahead Feature Validation',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only validation. It consumes saved miner reports only and does not run setupScanner, post Discord, write Supabase, read live bridge data, change scanner behavior, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Miner reports: ${report.summary.minerReports}.`,
    `- Event rows: ${report.summary.eventRows}.`,
    `- Candidate feature rows: ${report.summary.candidateFeatureRows}.`,
    `- Validation pass / reject rows: ${report.summary.validationPassRows}/${report.summary.validationRejectRows}.`,
    `- Live initial-rank feature rows: ${report.summary.liveInitialRankFeatureRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Validation Rows',
    ...report.validationRows.map((row) => `- ${row.featureTag}: source rows ${row.sourceRows}, caught underperformance ${row.caughtUnderperformanceRows}, false rejected priority winners ${row.falseRejectedPriorityBetterRows}, simulated delta vs installed priority ${row.simulatedDeltaVsInstalledPriority}, decision ${row.decision}.`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDrivePriorityNoLookaheadFeatureValidationReport(args: {
  minerReports: string[];
  loadedReports: RawOhlcScannerArtifactOpeningDrivePriorityNoLookaheadFeatureMinerReport[];
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDrivePriorityNoLookaheadFeatureValidationReport {
  const validationRows = buildValidationRows(args.loadedReports);
  const blockers = [
    args.minerReports.length === 0 ? 'no miner reports supplied' : null,
    args.loadedReports.some((report) => report.status !== 'pass') ? 'one or more miner reports did not pass' : null,
  ].filter((item): item is string => Boolean(item));
  const validationPassRows = validationRows.filter((row) => row.decision === 'candidate_needs_fresh_validation').length;
  const recommendation: RawOhlcScannerArtifactOpeningDrivePriorityNoLookaheadFeatureValidationReport['summary']['recommendation'] = blockers.length
    ? 'fix_inputs'
    : validationPassRows > 0
      ? 'queue_fresh_artifact_validation'
      : 'continue_observation';
  const base: Omit<RawOhlcScannerArtifactOpeningDrivePriorityNoLookaheadFeatureValidationReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_no_lookahead_feature_validation',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: { minerReports: args.minerReports },
    assumptions: {
      consumesSavedMinerReportsOnly: true,
      validatesResearchFeatureTagsOnly: true,
      noLiveScoringUsed: true,
      noSetupScannerRun: true,
      noDiscordOrSupabaseSideEffects: true,
      livePromotionAllowed: false,
    },
    summary: {
      minerReports: args.loadedReports.length,
      eventRows: args.loadedReports.reduce((total, report) => total + report.rows.length, 0),
      candidateFeatureRows: validationRows.length,
      validationPassRows,
      validationRejectRows: validationRows.length - validationPassRows,
      liveInitialRankFeatureRows: 0,
      livePromotionAllowedRows: 0,
      broadeningAllowedNow: false,
      recommendation,
    },
    validationRows,
    blockers,
    recommendations: recommendation === 'queue_fresh_artifact_validation'
      ? [
        'The candidate features remain research-only; validate them on fresh scanner artifacts before any live-facing rank overlay change.',
        'Keep first-replay-bar features out of initial publish ranking because they are post-entry research signals.',
      ]
      : recommendation === 'continue_observation'
        ? ['No candidate feature survived validation; continue collecting fresh observations.']
        : ['Fix miner report inputs before interpreting validation output.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function writeReport(report: RawOhlcScannerArtifactOpeningDrivePriorityNoLookaheadFeatureValidationReport, outDir: string): string {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-openingdrive-priority-no-lookahead-feature-validation-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(outDir, `${base}.md`), `${report.markdown}\n`, 'utf8');
  return jsonPath;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  const options = parseRawOhlcScannerArtifactOpeningDrivePriorityNoLookaheadFeatureValidationArgs();
  const minerReports = options.minerReports.length
    ? options.minerReports
    : latestReportPaths('raw-ohlc-scanner-artifact-openingdrive-priority-no-lookahead-feature-miner-');
  const report = buildRawOhlcScannerArtifactOpeningDrivePriorityNoLookaheadFeatureValidationReport({
    minerReports,
    loadedReports: minerReports.map((reportPath) => readJson<RawOhlcScannerArtifactOpeningDrivePriorityNoLookaheadFeatureMinerReport>(reportPath)),
  });
  const jsonPath = writeReport(report, options.outDir);
  if (options.json) console.log(JSON.stringify({ status: report.status, jsonPath, summary: report.summary, validationRows: report.validationRows, blockers: report.blockers }, null, 2));
  else { console.log(report.markdown); console.log(`\nWrote ${jsonPath}`); }
  if (report.status !== 'pass') process.exitCode = 1;
}
