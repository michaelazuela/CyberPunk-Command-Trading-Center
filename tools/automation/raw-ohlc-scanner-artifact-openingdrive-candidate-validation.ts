import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  RawOhlcScannerArtifactSameBarSeparatorDrilldownReport,
  RawOhlcScannerArtifactSameBarSeparatorRow,
} from './raw-ohlc-scanner-artifact-samebar-separator-drilldown';
import type { RawOhlcScannerArtifactSameBarAllowlistProbeReport } from './raw-ohlc-scanner-artifact-samebar-allowlist-probe';

interface CliOptions {
  samebarSeparatorReport: string;
  setupType: string;
  outDir: string;
  candidateDirection: string;
  candidateRiskBucket: string;
  validationStart: string | null;
  validationPercent: number;
  minValidationRows: number;
  json: boolean;
}

interface SplitSummary {
  split: 'all' | 'train' | 'validation';
  rows: number;
  matchingRows: number;
  matchingWinners: number;
  matchingLosses: number;
  matchingOtherResolved: number;
  matchingUnresolved: number;
  matchingWinRate: number | null;
  matchingOneMesPl: number | null;
  avgMatchingRiskPoints: number | null;
}

interface DateSummary {
  tradeDate: string;
  split: 'train' | 'validation';
  rows: number;
  matchingRows: number;
  matchingWinners: number;
  matchingLosses: number;
  matchingOtherResolved: number;
  matchingOneMesPl: number | null;
}

export interface RawOhlcScannerArtifactOpeningDriveCandidateValidationReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_candidate_validation';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: RawOhlcScannerArtifactSameBarAllowlistProbeReport['authority'];
  source: {
    reportDir: string;
    samebarSeparatorReportPath: string | null;
    setupType: string;
  };
  assumptions: {
    readOnlyPostProcessor: true;
    usesExistingSameBarSeparatorRowsOnly: true;
    validatesFrozenCandidateOnly: true;
    candidateUsesNoLookaheadFieldsOnly: true;
    outcomeFieldsAreEvaluationOnly: true;
    livePromotionAllowed: false;
  };
  candidate: {
    direction: string;
    riskBucket: string;
    feature: 'direction_risk';
    featureValue: string;
  };
  splitPolicy: {
    validationStart: string | null;
    validationPercent: number;
    minValidationRows: number;
    trainDates: string[];
    validationDates: string[];
  };
  summary: {
    sourceRows: number;
    matchingRows: number;
    validationDecision: 'validated_for_more_research' | 'not_validated';
    livePromotionAllowedRows: 0;
  };
  splitSummaries: SplitSummary[];
  dateSummaries: DateSummary[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const DEFAULT_SETUP_TYPE = 'OpeningDriveFvgContinuation';
const DEFAULT_CANDIDATE_DIRECTION = 'LONG';
const DEFAULT_CANDIDATE_RISK_BUCKET = 'risk_4_to_8';
const DEFAULT_VALIDATION_PERCENT = 0.3;
const DEFAULT_MIN_VALIDATION_ROWS = 3;

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function latestMatchingFile(reportDir: string, pattern: RegExp): string | null {
  if (!fs.existsSync(reportDir)) return null;
  const matches = fs.readdirSync(reportDir)
    .filter((name) => pattern.test(name))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return matches[0] || null;
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

export function parseRawOhlcScannerArtifactOpeningDriveCandidateValidationArgs(args = process.argv.slice(2)): CliOptions {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const samebarSeparatorReport = readFlag(args, '--samebar-separator-report') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-samebar-separator-drilldown-\d+\.json$/);
  const validationPercent = Number(readFlag(args, '--validation-percent') || DEFAULT_VALIDATION_PERCENT);
  const minValidationRows = Number(readFlag(args, '--min-validation-rows') || DEFAULT_MIN_VALIDATION_ROWS);
  if (!samebarSeparatorReport) throw new Error('--samebar-separator-report is required.');
  if (!Number.isFinite(validationPercent) || validationPercent <= 0 || validationPercent >= 1) {
    throw new Error('--validation-percent must be greater than 0 and less than 1.');
  }
  if (!Number.isFinite(minValidationRows) || minValidationRows < 1) {
    throw new Error('--min-validation-rows must be a positive number.');
  }
  return {
    samebarSeparatorReport,
    setupType: readFlag(args, '--setup-type') || DEFAULT_SETUP_TYPE,
    outDir,
    candidateDirection: (readFlag(args, '--candidate-direction') || DEFAULT_CANDIDATE_DIRECTION).toUpperCase(),
    candidateRiskBucket: readFlag(args, '--candidate-risk-bucket') || DEFAULT_CANDIDATE_RISK_BUCKET,
    validationStart: readFlag(args, '--validation-start'),
    validationPercent,
    minValidationRows,
    json: args.includes('--json'),
  };
}

function authority(): RawOhlcScannerArtifactSameBarAllowlistProbeReport['authority'] {
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

function sum(values: Array<number | null | undefined>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? round(numeric.reduce((total, value) => total + value, 0)) : null;
}

function avg(values: Array<number | null | undefined>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? round(numeric.reduce((total, value) => total + value, 0) / numeric.length) : null;
}

function isWinner(row: RawOhlcScannerArtifactSameBarSeparatorRow): boolean {
  return row.outcomeStatus === 'resolved' && row.outcomeLabel === 't1_and_t2_hit';
}

function isLoss(row: RawOhlcScannerArtifactSameBarSeparatorRow): boolean {
  return row.outcomeStatus === 'resolved' && row.outcomeLabel === 'stopped_before_t1';
}

function riskBucket(row: RawOhlcScannerArtifactSameBarSeparatorRow): string {
  if (row.riskPoints < 4) return 'risk_lt_4';
  if (row.riskPoints < 8) return 'risk_4_to_8';
  if (row.riskPoints < 16) return 'risk_8_to_16';
  return 'risk_gte_16';
}

function matchesCandidate(row: RawOhlcScannerArtifactSameBarSeparatorRow, direction: string, candidateRiskBucket: string): boolean {
  return row.direction.toUpperCase() === direction && riskBucket(row) === candidateRiskBucket;
}

function splitDates(dates: string[], validationStart: string | null, validationPercent: number): { trainDates: string[]; validationDates: string[] } {
  const uniqueDates = [...new Set(dates)].sort();
  if (validationStart) {
    return {
      trainDates: uniqueDates.filter((date) => date < validationStart),
      validationDates: uniqueDates.filter((date) => date >= validationStart),
    };
  }
  const validationCount = Math.max(1, Math.ceil(uniqueDates.length * validationPercent));
  return {
    trainDates: uniqueDates.slice(0, Math.max(0, uniqueDates.length - validationCount)),
    validationDates: uniqueDates.slice(Math.max(0, uniqueDates.length - validationCount)),
  };
}

function summarize(
  split: SplitSummary['split'],
  rows: RawOhlcScannerArtifactSameBarSeparatorRow[],
  direction: string,
  candidateRiskBucket: string,
): SplitSummary {
  const matchingRows = rows.filter((row) => matchesCandidate(row, direction, candidateRiskBucket));
  const matchingWinners = matchingRows.filter(isWinner).length;
  const matchingLosses = matchingRows.filter(isLoss).length;
  const matchingOtherResolved = matchingRows.filter((row) => row.outcomeStatus === 'resolved' && !isWinner(row) && !isLoss(row)).length;
  return {
    split,
    rows: rows.length,
    matchingRows: matchingRows.length,
    matchingWinners,
    matchingLosses,
    matchingOtherResolved,
    matchingUnresolved: matchingRows.filter((row) => row.outcomeStatus !== 'resolved').length,
    matchingWinRate: matchingRows.length ? round(matchingWinners / matchingRows.length) : null,
    matchingOneMesPl: sum(matchingRows.map((row) => row.resolvedOneMesPl)),
    avgMatchingRiskPoints: avg(matchingRows.map((row) => row.riskPoints)),
  };
}

function dateSummaries(
  rows: RawOhlcScannerArtifactSameBarSeparatorRow[],
  trainDates: string[],
  validationDates: string[],
  direction: string,
  candidateRiskBucket: string,
): DateSummary[] {
  return [...new Set(rows.map((row) => row.tradeDate))].sort().map((tradeDate) => {
    const dateRows = rows.filter((row) => row.tradeDate === tradeDate);
    const matchingRows = dateRows.filter((row) => matchesCandidate(row, direction, candidateRiskBucket));
    const split: DateSummary['split'] = validationDates.includes(tradeDate) ? 'validation' : 'train';
    return {
      tradeDate,
      split,
      rows: dateRows.length,
      matchingRows: matchingRows.length,
      matchingWinners: matchingRows.filter(isWinner).length,
      matchingLosses: matchingRows.filter(isLoss).length,
      matchingOtherResolved: matchingRows.filter((row) => row.outcomeStatus === 'resolved' && !isWinner(row) && !isLoss(row)).length,
      matchingOneMesPl: sum(matchingRows.map((row) => row.resolvedOneMesPl)),
    };
  }).filter((row) => trainDates.includes(row.tradeDate) || validationDates.includes(row.tradeDate));
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDriveCandidateValidationReport, 'markdown'>): string {
  return [
    '# Raw OHLC OpeningDrive Candidate Validation',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only frozen-candidate validation. It does not post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change trading logic, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Candidate',
    `- Feature: ${report.candidate.feature}=${report.candidate.featureValue}.`,
    `- Validation decision: ${report.summary.validationDecision}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    '',
    '## Split Summary',
    '| Split | Rows | Matching Rows | W/L/O/U | Win Rate | P/L | Avg Risk |',
    '|---|---:|---:|---|---:|---:|---:|',
    ...report.splitSummaries.map((row) => `| ${row.split} | ${row.rows} | ${row.matchingRows} | ${row.matchingWinners}/${row.matchingLosses}/${row.matchingOtherResolved}/${row.matchingUnresolved} | ${row.matchingWinRate ?? '-'} | ${row.matchingOneMesPl ?? '-'} | ${row.avgMatchingRiskPoints ?? '-'} |`),
    '',
    '## Validation Dates',
    '| Date | Rows | Matching Rows | W/L/O | P/L |',
    '|---|---:|---:|---|---:|',
    ...report.dateSummaries.filter((row) => row.split === 'validation').map((row) => `| ${row.tradeDate} | ${row.rows} | ${row.matchingRows} | ${row.matchingWinners}/${row.matchingLosses}/${row.matchingOtherResolved} | ${row.matchingOneMesPl ?? '-'} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDriveCandidateValidationReport(args: {
  reportDir: string;
  samebarSeparatorReportPath: string | null;
  samebarSeparatorReport: RawOhlcScannerArtifactSameBarSeparatorDrilldownReport | null;
  setupType: string;
  candidateDirection?: string;
  candidateRiskBucket?: string;
  validationStart?: string | null;
  validationPercent?: number;
  minValidationRows?: number;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDriveCandidateValidationReport {
  const direction = (args.candidateDirection || DEFAULT_CANDIDATE_DIRECTION).toUpperCase();
  const candidateRiskBucket = args.candidateRiskBucket || DEFAULT_CANDIDATE_RISK_BUCKET;
  const validationPercent = args.validationPercent ?? DEFAULT_VALIDATION_PERCENT;
  const minValidationRows = args.minValidationRows ?? DEFAULT_MIN_VALIDATION_ROWS;
  const rows = (args.samebarSeparatorReport?.rows || []).filter((row) => row.setupType === args.setupType);
  const { trainDates, validationDates } = splitDates(rows.map((row) => row.tradeDate), args.validationStart || null, validationPercent);
  const trainRows = rows.filter((row) => trainDates.includes(row.tradeDate));
  const validationRows = rows.filter((row) => validationDates.includes(row.tradeDate));
  const allSummary = summarize('all', rows, direction, candidateRiskBucket);
  const trainSummary = summarize('train', trainRows, direction, candidateRiskBucket);
  const validationSummary = summarize('validation', validationRows, direction, candidateRiskBucket);
  const blockers = [
    !args.samebarSeparatorReportPath ? 'missing same-bar separator report path' : null,
    !args.samebarSeparatorReport ? 'missing same-bar separator report' : null,
    args.samebarSeparatorReport && args.samebarSeparatorReport.status !== 'pass' ? `same-bar separator status ${args.samebarSeparatorReport.status}` : null,
    rows.length === 0 ? `no same-bar rows found for ${args.setupType}` : null,
    trainDates.length === 0 ? 'no train dates available' : null,
    validationDates.length === 0 ? 'no validation dates available' : null,
  ].filter((item): item is string => Boolean(item));
  const validationDecision = !blockers.length &&
    validationSummary.matchingRows >= minValidationRows &&
    validationSummary.matchingLosses === 0 &&
    (validationSummary.matchingOneMesPl ?? 0) > 0
    ? 'validated_for_more_research'
    : 'not_validated';
  const recommendations = blockers.length
    ? ['Do not use OpeningDrive candidate validation until the same-bar source report loads cleanly.']
    : validationDecision === 'validated_for_more_research'
      ? [
        'The frozen no-lookahead candidate held up on the validation split as a research lead.',
        'Do not install a scanner-visible filter yet; next validate with richer proof-time geometry and a fresh replay package.',
        'No Discord, Supabase, NinjaTrader bridge, canExecute, entry/stop/target/risk, or trading-rule change is approved by this validation.',
      ]
      : [
        'The frozen no-lookahead candidate did not clear the validation gate.',
        'Keep OpeningDrive candidate selection research-only and mine richer proof-time geometry before any live-facing change.',
        'No Discord, Supabase, NinjaTrader bridge, canExecute, entry/stop/target/risk, or trading-rule change is approved by this validation.',
      ];
  const base: Omit<RawOhlcScannerArtifactOpeningDriveCandidateValidationReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_candidate_validation',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      samebarSeparatorReportPath: args.samebarSeparatorReportPath,
      setupType: args.setupType,
    },
    assumptions: {
      readOnlyPostProcessor: true,
      usesExistingSameBarSeparatorRowsOnly: true,
      validatesFrozenCandidateOnly: true,
      candidateUsesNoLookaheadFieldsOnly: true,
      outcomeFieldsAreEvaluationOnly: true,
      livePromotionAllowed: false,
    },
    candidate: {
      direction,
      riskBucket: candidateRiskBucket,
      feature: 'direction_risk',
      featureValue: `${direction}|${candidateRiskBucket}`,
    },
    splitPolicy: {
      validationStart: args.validationStart || null,
      validationPercent,
      minValidationRows,
      trainDates,
      validationDates,
    },
    summary: {
      sourceRows: rows.length,
      matchingRows: allSummary.matchingRows,
      validationDecision,
      livePromotionAllowedRows: 0,
    },
    splitSummaries: [allSummary, trainSummary, validationSummary],
    dateSummaries: dateSummaries(rows, trainDates, validationDates, direction, candidateRiskBucket),
    blockers,
    recommendations,
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactOpeningDriveCandidateValidationReport(
  report: RawOhlcScannerArtifactOpeningDriveCandidateValidationReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-openingdrive-candidate-validation-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactOpeningDriveCandidateValidationCli(args = process.argv.slice(2)): void {
  const options = parseRawOhlcScannerArtifactOpeningDriveCandidateValidationArgs(args);
  const samebarSeparatorReport = fs.existsSync(options.samebarSeparatorReport)
    ? readJson<RawOhlcScannerArtifactSameBarSeparatorDrilldownReport>(options.samebarSeparatorReport)
    : null;
  const report = buildRawOhlcScannerArtifactOpeningDriveCandidateValidationReport({
    reportDir: options.outDir,
    samebarSeparatorReportPath: options.samebarSeparatorReport,
    samebarSeparatorReport,
    setupType: options.setupType,
    candidateDirection: options.candidateDirection,
    candidateRiskBucket: options.candidateRiskBucket,
    validationStart: options.validationStart,
    validationPercent: options.validationPercent,
    minValidationRows: options.minValidationRows,
  });
  const paths = writeRawOhlcScannerArtifactOpeningDriveCandidateValidationReport(report, options.outDir);
  if (options.json) {
    console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, splitSummaries: report.splitSummaries, blockers: report.blockers }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runRawOhlcScannerArtifactOpeningDriveCandidateValidationCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
