import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  RawOhlcScannerArtifactOpeningDrivePriorityNoLookaheadFeatureMinerReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-no-lookahead-feature-miner';
import type {
  RawOhlcScannerArtifactOpeningDrivePriorityNoLookaheadFeatureValidationReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-no-lookahead-feature-validation';

interface CliOptions {
  validationReports: string[];
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
type ValidationRow = RawOhlcScannerArtifactOpeningDrivePriorityNoLookaheadFeatureValidationReport['validationRows'][number];

interface PackageRow {
  featureTag: 'proof_bar_failed_close_through_entry';
  sourceSelectionReport: string;
  replayPackagePath: string | null;
  tradeDate: string;
  session: string;
  proofTime: string;
  direction: string;
  openingDriveTicketId: string;
  priorityTicketId: string;
  prioritySetupType: string;
  openingDriveOneMesPl: number | null;
  priorityOneMesPl: number | null;
  simulatedDeltaVsInstalledPriority: number | null;
  requiredFreshEvidence: string[];
  evaluationOnly: true;
}

export interface RawOhlcScannerArtifactOpeningDrivePriorityFreshFeaturePackageReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_fresh_feature_package';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: Authority;
  source: {
    validationReports: string[];
    minerReports: string[];
  };
  assumptions: {
    consumesSavedValidationAndMinerReportsOnly: true;
    packagesInitialRankUsableFeatureOnly: true;
    excludesPostEntryResearchFeatures: true;
    outcomeFieldsAreEvaluationOnly: true;
    noLiveScoringUsed: true;
    noSetupScannerRun: true;
    livePromotionAllowed: false;
  };
  summary: {
    validationReports: number;
    minerReports: number;
    validationCandidateRows: number;
    initialRankFeaturePackageRows: number;
    postEntryOnlyFeatureRowsExcluded: number;
    liveInitialRankFeatureRows: 0;
    livePromotionAllowedRows: 0;
    broadeningAllowedNow: false;
    recommendation: 'run_fresh_scanner_artifact_comparison' | 'continue_observation' | 'fix_inputs';
  };
  packageRows: PackageRow[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const INITIAL_RANK_FEATURE = 'proof_bar_failed_close_through_entry' as const;

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

export function parseRawOhlcScannerArtifactOpeningDrivePriorityFreshFeaturePackageArgs(
  argv = process.argv.slice(2),
): CliOptions {
  return {
    validationReports: splitPaths(readFlag(argv, '--validation-reports')).map((item) => path.resolve(item)),
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

function matchingMinerRows(validationReports: RawOhlcScannerArtifactOpeningDrivePriorityNoLookaheadFeatureValidationReport[]): {
  minerReports: string[];
  rows: MinerRow[];
} {
  const minerReports = [...new Set(validationReports.flatMap((report) => report.source.minerReports))];
  return {
    minerReports,
    rows: minerReports.flatMap((reportPath) => readJson<RawOhlcScannerArtifactOpeningDrivePriorityNoLookaheadFeatureMinerReport>(reportPath).rows),
  };
}

function buildPackageRows(rows: MinerRow[]): PackageRow[] {
  return rows
    .filter((row) => row.immediateFeatureTags.includes(INITIAL_RANK_FEATURE))
    .map((row) => ({
      featureTag: INITIAL_RANK_FEATURE,
      sourceSelectionReport: row.sourceSelectionReport,
      replayPackagePath: row.replayPackagePath,
      tradeDate: row.tradeDate,
      session: row.session,
      proofTime: row.proofTime,
      direction: row.direction,
      openingDriveTicketId: row.openingDriveTicketId,
      priorityTicketId: row.priorityTicketId,
      prioritySetupType: row.prioritySetupType,
      openingDriveOneMesPl: row.openingDriveOneMesPl,
      priorityOneMesPl: row.priorityOneMesPl,
      simulatedDeltaVsInstalledPriority: typeof row.openingDriveOneMesPl === 'number' && typeof row.priorityOneMesPl === 'number'
        ? row.openingDriveOneMesPl - row.priorityOneMesPl
        : null,
      requiredFreshEvidence: [
        'fresh source-selection artifact with same-event OpeningDrive and installed-priority candidates',
        'scanner decision tape with completed 5M proof bar',
        'proof bar failed to close through priority entry in candidate direction',
        'fresh replay outcome comparison for OpeningDrive fallback versus installed priority',
      ],
      evaluationOnly: true,
    }));
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDrivePriorityFreshFeaturePackageReport, 'markdown'>): string {
  return [
    '# OpeningDrive Priority Fresh Feature Package',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only package builder. It consumes saved validation/miner reports only and does not run setupScanner, post Discord, write Supabase, read live bridge data, change scanner behavior, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Validation reports: ${report.summary.validationReports}.`,
    `- Miner reports: ${report.summary.minerReports}.`,
    `- Initial-rank feature package rows: ${report.summary.initialRankFeaturePackageRows}.`,
    `- Post-entry-only feature rows excluded: ${report.summary.postEntryOnlyFeatureRowsExcluded}.`,
    `- Live promotion rows: ${report.summary.livePromotionAllowedRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Package Rows',
    ...report.packageRows.map((row) => `- ${row.tradeDate} ${row.session} ${row.direction} ${row.proofTime}: ${row.featureTag}, priority ${row.priorityTicketId}, OpeningDrive ${row.openingDriveTicketId}, simulated delta ${row.simulatedDeltaVsInstalledPriority}.`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDrivePriorityFreshFeaturePackageReport(args: {
  validationReports: string[];
  loadedValidationReports: RawOhlcScannerArtifactOpeningDrivePriorityNoLookaheadFeatureValidationReport[];
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDrivePriorityFreshFeaturePackageReport {
  const validationRows = args.loadedValidationReports.flatMap((report) => report.validationRows);
  const initialRankValidationRows = validationRows.filter((row: ValidationRow) => row.featureTag === INITIAL_RANK_FEATURE);
  const postEntryOnlyFeatureRowsExcluded = validationRows.filter((row: ValidationRow) => row.featureTag !== INITIAL_RANK_FEATURE).length;
  const miner = matchingMinerRows(args.loadedValidationReports);
  const packageRows = buildPackageRows(miner.rows);
  const blockers = [
    args.validationReports.length === 0 ? 'no validation reports supplied' : null,
    args.loadedValidationReports.some((report) => report.status !== 'pass') ? 'one or more validation reports did not pass' : null,
    initialRankValidationRows.length === 0 ? 'no initial-rank usable validation feature found' : null,
  ].filter((item): item is string => Boolean(item));
  const recommendation: RawOhlcScannerArtifactOpeningDrivePriorityFreshFeaturePackageReport['summary']['recommendation'] = blockers.length
    ? 'fix_inputs'
    : packageRows.length > 0
      ? 'run_fresh_scanner_artifact_comparison'
      : 'continue_observation';
  const base: Omit<RawOhlcScannerArtifactOpeningDrivePriorityFreshFeaturePackageReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_fresh_feature_package',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      validationReports: args.validationReports,
      minerReports: miner.minerReports,
    },
    assumptions: {
      consumesSavedValidationAndMinerReportsOnly: true,
      packagesInitialRankUsableFeatureOnly: true,
      excludesPostEntryResearchFeatures: true,
      outcomeFieldsAreEvaluationOnly: true,
      noLiveScoringUsed: true,
      noSetupScannerRun: true,
      livePromotionAllowed: false,
    },
    summary: {
      validationReports: args.loadedValidationReports.length,
      minerReports: miner.minerReports.length,
      validationCandidateRows: validationRows.length,
      initialRankFeaturePackageRows: packageRows.length,
      postEntryOnlyFeatureRowsExcluded,
      liveInitialRankFeatureRows: 0,
      livePromotionAllowedRows: 0,
      broadeningAllowedNow: false,
      recommendation,
    },
    packageRows,
    blockers,
    recommendations: recommendation === 'run_fresh_scanner_artifact_comparison'
      ? [
        'Run the next comparison on fresh scanner artifacts using proof_bar_failed_close_through_entry only.',
        'Keep first_replay_adverse_ge_0_25r as post-entry telemetry and out of initial publish ranking.',
      ]
      : recommendation === 'continue_observation'
        ? ['No package rows were created; continue collecting observations.']
        : ['Fix validation inputs before creating a fresh feature package.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function writeReport(report: RawOhlcScannerArtifactOpeningDrivePriorityFreshFeaturePackageReport, outDir: string): string {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-openingdrive-priority-fresh-feature-package-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(outDir, `${base}.md`), `${report.markdown}\n`, 'utf8');
  return jsonPath;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  const options = parseRawOhlcScannerArtifactOpeningDrivePriorityFreshFeaturePackageArgs();
  const validationReports = options.validationReports.length
    ? options.validationReports
    : latestReportPaths('raw-ohlc-scanner-artifact-openingdrive-priority-no-lookahead-feature-validation-');
  const report = buildRawOhlcScannerArtifactOpeningDrivePriorityFreshFeaturePackageReport({
    validationReports,
    loadedValidationReports: validationReports.map((reportPath) => readJson<RawOhlcScannerArtifactOpeningDrivePriorityNoLookaheadFeatureValidationReport>(reportPath)),
  });
  const jsonPath = writeReport(report, options.outDir);
  if (options.json) console.log(JSON.stringify({ status: report.status, jsonPath, summary: report.summary, packageRows: report.packageRows, blockers: report.blockers }, null, 2));
  else { console.log(report.markdown); console.log(`\nWrote ${jsonPath}`); }
  if (report.status !== 'pass') process.exitCode = 1;
}
