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
  minBucketRows: number;
  json: boolean;
}

interface RowSummary {
  rows: number;
  winners: number;
  losses: number;
  otherResolved: number;
  unresolved: number;
  winRate: number | null;
  oneMesPl: number | null;
  avgRiskPoints: number | null;
}

interface FeatureBucketSummary extends RowSummary {
  feature: string;
  value: string;
  recommendation: string;
}

interface OtherResolvedCandidateRow {
  ticketId: string;
  tradeDate: string;
  session: string;
  direction: string;
  proofTime: string;
  timeBucket: string;
  minuteBucket: string;
  riskPoints: number;
  fineRiskBucket: string;
  outcomeLabel: RawOhlcScannerArtifactSameBarSeparatorRow['outcomeLabel'];
  oneMesPl: number | null;
}

export interface RawOhlcScannerArtifactOpeningDriveRejectedGeometryMinerReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_rejected_geometry_miner';
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
    minesRejectedRowsFromFrozenCandidate: true;
    featureFieldsAreNoLookaheadOnly: true;
    outcomeFieldsAreEvaluationOnly: true;
    livePromotionAllowed: false;
  };
  candidate: {
    direction: string;
    riskBucket: string;
    feature: 'direction_risk';
    featureValue: string;
  };
  summary: {
    sourceRows: number;
    candidateRows: number;
    rejectedRows: number;
    candidateSummary: RowSummary;
    rejectedSummary: RowSummary;
    rejectedWinnerRows: number;
    rejectedLossRows: number;
    livePromotionAllowedRows: 0;
  };
  topRejectedBuckets: FeatureBucketSummary[];
  otherResolvedCandidateRows: OtherResolvedCandidateRow[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const DEFAULT_SETUP_TYPE = 'NoInstalledSetup';
const DEFAULT_CANDIDATE_DIRECTION = 'LONG';
const DEFAULT_CANDIDATE_RISK_BUCKET = 'risk_4_to_8';
const DEFAULT_MIN_BUCKET_ROWS = 3;

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

export function parseRawOhlcScannerArtifactOpeningDriveRejectedGeometryMinerArgs(args = process.argv.slice(2)): CliOptions {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const samebarSeparatorReport = readFlag(args, '--samebar-separator-report') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-samebar-separator-drilldown-\d+\.json$/);
  const minBucketRows = Number(readFlag(args, '--min-bucket-rows') || DEFAULT_MIN_BUCKET_ROWS);
  if (!samebarSeparatorReport) throw new Error('--samebar-separator-report is required.');
  if (!Number.isFinite(minBucketRows) || minBucketRows < 1) {
    throw new Error('--min-bucket-rows must be a positive number.');
  }
  return {
    samebarSeparatorReport,
    setupType: readFlag(args, '--setup-type') || DEFAULT_SETUP_TYPE,
    outDir,
    candidateDirection: (readFlag(args, '--candidate-direction') || DEFAULT_CANDIDATE_DIRECTION).toUpperCase(),
    candidateRiskBucket: readFlag(args, '--candidate-risk-bucket') || DEFAULT_CANDIDATE_RISK_BUCKET,
    minBucketRows,
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

function summarizeRows(rows: RawOhlcScannerArtifactSameBarSeparatorRow[]): RowSummary {
  const winners = rows.filter(isWinner).length;
  const losses = rows.filter(isLoss).length;
  const otherResolved = rows.filter((row) => row.outcomeStatus === 'resolved' && !isWinner(row) && !isLoss(row)).length;
  return {
    rows: rows.length,
    winners,
    losses,
    otherResolved,
    unresolved: rows.filter((row) => row.outcomeStatus !== 'resolved').length,
    winRate: rows.length ? round(winners / rows.length) : null,
    oneMesPl: sum(rows.map((row) => row.resolvedOneMesPl)),
    avgRiskPoints: avg(rows.map((row) => row.riskPoints)),
  };
}

function riskBucket(row: RawOhlcScannerArtifactSameBarSeparatorRow): string {
  if (row.riskPoints < 4) return 'risk_lt_4';
  if (row.riskPoints < 8) return 'risk_4_to_8';
  if (row.riskPoints < 16) return 'risk_8_to_16';
  return 'risk_gte_16';
}

function fineRiskBucket(row: RawOhlcScannerArtifactSameBarSeparatorRow): string {
  if (row.riskPoints < 4) return 'risk_lt_4';
  if (row.riskPoints < 6) return 'risk_4_to_6';
  if (row.riskPoints < 8) return 'risk_6_to_8';
  if (row.riskPoints < 16) return 'risk_8_to_16';
  if (row.riskPoints < 24) return 'risk_16_to_24';
  if (row.riskPoints < 32) return 'risk_24_to_32';
  return 'risk_gte_32';
}

function minuteBucket(row: RawOhlcScannerArtifactSameBarSeparatorRow): string {
  const minute = Number(row.proofTime.slice(14, 16));
  if (!Number.isFinite(minute) || minute < 0 || minute > 59) return 'minute_unknown';
  if (minute < 15) return 'minute_00_14';
  if (minute < 30) return 'minute_15_29';
  if (minute < 45) return 'minute_30_44';
  return 'minute_45_59';
}

function matchesCandidate(row: RawOhlcScannerArtifactSameBarSeparatorRow, direction: string, candidateRiskBucket: string): boolean {
  return row.direction.toUpperCase() === direction && riskBucket(row) === candidateRiskBucket;
}

function featureValues(row: RawOhlcScannerArtifactSameBarSeparatorRow): Array<{ feature: string; value: string }> {
  const direction = row.direction.toUpperCase();
  const risk = riskBucket(row);
  const fineRisk = fineRiskBucket(row);
  const minute = minuteBucket(row);
  return [
    { feature: 'session', value: row.session },
    { feature: 'direction', value: direction },
    { feature: 'riskBucket', value: risk },
    { feature: 'fineRiskBucket', value: fineRisk },
    { feature: 'timeBucket', value: row.timeBucket },
    { feature: 'minuteBucket', value: minute },
    { feature: 'time_direction', value: `${row.timeBucket}|${direction}` },
    { feature: 'direction_risk', value: `${direction}|${risk}` },
    { feature: 'direction_fineRisk', value: `${direction}|${fineRisk}` },
    { feature: 'time_direction_risk', value: `${row.timeBucket}|${direction}|${risk}` },
    { feature: 'time_fineRisk', value: `${row.timeBucket}|${fineRisk}` },
    { feature: 'minute_direction_risk', value: `${minute}|${direction}|${risk}` },
  ];
}

function recommendation(summary: RowSummary): string {
  if (summary.rows > 0 && summary.losses === 0 && summary.winners > 0 && (summary.oneMesPl ?? 0) > 0) {
    return 'Clean rejected research lead: no stopped-before-T1 rows in this sample; validate out of sample before any scanner-visible use.';
  }
  if (summary.winners > summary.losses && (summary.oneMesPl ?? 0) > 0) {
    return 'Positive but loss-bearing rejected bucket; mine richer proof-time structure before any rank or filter use.';
  }
  if (summary.losses > 0) {
    return 'Loss-bearing rejected bucket; do not promote from this field alone.';
  }
  return 'Insufficient rejected evidence.';
}

function topRejectedBuckets(rows: RawOhlcScannerArtifactSameBarSeparatorRow[], minBucketRows: number): FeatureBucketSummary[] {
  const grouped = new Map<string, { feature: string; value: string; rows: RawOhlcScannerArtifactSameBarSeparatorRow[] }>();
  for (const row of rows) {
    for (const item of featureValues(row)) {
      const key = `${item.feature}=${item.value}`;
      const existing = grouped.get(key) || { ...item, rows: [] };
      existing.rows.push(row);
      grouped.set(key, existing);
    }
  }
  return [...grouped.values()]
    .map((group) => {
      const summary = summarizeRows(group.rows);
      return { feature: group.feature, value: group.value, ...summary, recommendation: recommendation(summary) };
    })
    .filter((summary) => summary.rows >= minBucketRows && (summary.winners > 0 || summary.losses > 0))
    .sort((a, b) => {
      if (a.losses !== b.losses) return a.losses - b.losses;
      if ((b.oneMesPl ?? -Infinity) !== (a.oneMesPl ?? -Infinity)) return (b.oneMesPl ?? -Infinity) - (a.oneMesPl ?? -Infinity);
      return b.winners - a.winners;
    })
    .slice(0, 20);
}

function otherResolvedCandidateRows(rows: RawOhlcScannerArtifactSameBarSeparatorRow[]): OtherResolvedCandidateRow[] {
  return rows
    .filter((row) => row.outcomeStatus === 'resolved' && !isWinner(row) && !isLoss(row))
    .map((row) => ({
      ticketId: row.ticketId,
      tradeDate: row.tradeDate,
      session: row.session,
      direction: row.direction,
      proofTime: row.proofTime,
      timeBucket: row.timeBucket,
      minuteBucket: minuteBucket(row),
      riskPoints: row.riskPoints,
      fineRiskBucket: fineRiskBucket(row),
      outcomeLabel: row.outcomeLabel,
      oneMesPl: row.resolvedOneMesPl,
    }));
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDriveRejectedGeometryMinerReport, 'markdown'>): string {
  return [
    '# Raw OHLC OpeningDrive Rejected Geometry Miner',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only research miner. It does not post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change trading logic, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Candidate Boundary',
    `- Frozen candidate: ${report.candidate.feature}=${report.candidate.featureValue}.`,
    `- Source rows: ${report.summary.sourceRows}.`,
    `- Candidate/rejected rows: ${report.summary.candidateRows}/${report.summary.rejectedRows}.`,
    `- Rejected winners/losses: ${report.summary.rejectedWinnerRows}/${report.summary.rejectedLossRows}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    '',
    '## Candidate vs Rejected',
    '| Bucket | Rows | W/L/O/U | Win Rate | P/L | Avg Risk |',
    '|---|---:|---|---:|---:|---:|',
    `| Candidate | ${report.summary.candidateSummary.rows} | ${report.summary.candidateSummary.winners}/${report.summary.candidateSummary.losses}/${report.summary.candidateSummary.otherResolved}/${report.summary.candidateSummary.unresolved} | ${report.summary.candidateSummary.winRate ?? '-'} | ${report.summary.candidateSummary.oneMesPl ?? '-'} | ${report.summary.candidateSummary.avgRiskPoints ?? '-'} |`,
    `| Rejected | ${report.summary.rejectedSummary.rows} | ${report.summary.rejectedSummary.winners}/${report.summary.rejectedSummary.losses}/${report.summary.rejectedSummary.otherResolved}/${report.summary.rejectedSummary.unresolved} | ${report.summary.rejectedSummary.winRate ?? '-'} | ${report.summary.rejectedSummary.oneMesPl ?? '-'} | ${report.summary.rejectedSummary.avgRiskPoints ?? '-'} |`,
    '',
    '## Top Rejected Proof-Time Buckets',
    '| Feature | Value | Rows | W/L/O/U | P/L | Avg Risk | Recommendation |',
    '|---|---|---:|---|---:|---:|---|',
    ...report.topRejectedBuckets.map((row) => `| ${escapeTable(row.feature)} | ${escapeTable(row.value)} | ${row.rows} | ${row.winners}/${row.losses}/${row.otherResolved}/${row.unresolved} | ${row.oneMesPl ?? '-'} | ${row.avgRiskPoints ?? '-'} | ${escapeTable(row.recommendation)} |`),
    '',
    '## Other-Resolved Candidate Rows',
    ...(report.otherResolvedCandidateRows.length
      ? [
        '| Ticket | Date | Session | Direction | Proof Time | Time | Minute | Risk | Outcome | P/L |',
        '|---|---|---|---|---|---|---|---:|---|---:|',
        ...report.otherResolvedCandidateRows.map((row) => `| ${escapeTable(row.ticketId)} | ${row.tradeDate} | ${row.session} | ${row.direction} | ${row.proofTime} | ${row.timeBucket} | ${row.minuteBucket} | ${row.riskPoints} | ${escapeTable(String(row.outcomeLabel))} | ${row.oneMesPl ?? '-'} |`),
      ]
      : ['- None.']),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDriveRejectedGeometryMinerReport(args: {
  reportDir: string;
  samebarSeparatorReportPath: string | null;
  samebarSeparatorReport: RawOhlcScannerArtifactSameBarSeparatorDrilldownReport | null;
  setupType: string;
  candidateDirection?: string;
  candidateRiskBucket?: string;
  minBucketRows?: number;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDriveRejectedGeometryMinerReport {
  const direction = (args.candidateDirection || DEFAULT_CANDIDATE_DIRECTION).toUpperCase();
  const candidateRiskBucket = args.candidateRiskBucket || DEFAULT_CANDIDATE_RISK_BUCKET;
  const minBucketRows = args.minBucketRows ?? DEFAULT_MIN_BUCKET_ROWS;
  const rows = (args.samebarSeparatorReport?.rows || []).filter((row) => row.setupType === args.setupType);
  const candidateRows = rows.filter((row) => matchesCandidate(row, direction, candidateRiskBucket));
  const rejectedRows = rows.filter((row) => !matchesCandidate(row, direction, candidateRiskBucket));
  const blockers = [
    !args.samebarSeparatorReportPath ? 'missing same-bar separator report path' : null,
    !args.samebarSeparatorReport ? 'missing same-bar separator report' : null,
    args.samebarSeparatorReport && args.samebarSeparatorReport.status !== 'pass' ? `same-bar separator status ${args.samebarSeparatorReport.status}` : null,
    rows.length === 0 ? `no same-bar rows found for ${args.setupType}` : null,
    minBucketRows < 1 ? 'min bucket rows must be positive' : null,
  ].filter((item): item is string => Boolean(item));
  const rejectedSummary = summarizeRows(rejectedRows);
  const buckets = topRejectedBuckets(rejectedRows, minBucketRows);
  const cleanBuckets = buckets.filter((bucket) => bucket.losses === 0 && bucket.winners > 0);
  const base: Omit<RawOhlcScannerArtifactOpeningDriveRejectedGeometryMinerReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_rejected_geometry_miner',
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
      minesRejectedRowsFromFrozenCandidate: true,
      featureFieldsAreNoLookaheadOnly: true,
      outcomeFieldsAreEvaluationOnly: true,
      livePromotionAllowed: false,
    },
    candidate: {
      direction,
      riskBucket: candidateRiskBucket,
      feature: 'direction_risk',
      featureValue: `${direction}|${candidateRiskBucket}`,
    },
    summary: {
      sourceRows: rows.length,
      candidateRows: candidateRows.length,
      rejectedRows: rejectedRows.length,
      candidateSummary: summarizeRows(candidateRows),
      rejectedSummary,
      rejectedWinnerRows: rejectedSummary.winners,
      rejectedLossRows: rejectedSummary.losses,
      livePromotionAllowedRows: 0,
    },
    topRejectedBuckets: buckets,
    otherResolvedCandidateRows: otherResolvedCandidateRows(candidateRows),
    blockers,
    recommendations: blockers.length
      ? ['Do not use rejected-geometry research until the same-bar source report loads cleanly.']
      : [
        cleanBuckets.length
          ? `Research found ${cleanBuckets.length} clean rejected proof-time bucket(s); freeze the best one and validate it before any scanner-visible use.`
          : 'No clean rejected proof-time bucket cleared this pass; do not expand the candidate from these proxy fields alone.',
        rejectedSummary.losses > 0
          ? 'The rejected population remains loss-bearing, so broad OpeningDrive same-bar promotion is still not justified.'
          : 'The rejected population has no stopped-before-T1 rows in this sample, but still needs independent validation.',
        'Outcome labels, P/L, MFE/MAE, and hit times are evaluation-only and must not become live filter inputs.',
        'No Discord, Supabase, NinjaTrader bridge, canExecute, entry/stop/target/risk, or trading-rule change is approved by this miner.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactOpeningDriveRejectedGeometryMinerReport(
  report: RawOhlcScannerArtifactOpeningDriveRejectedGeometryMinerReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-openingdrive-rejected-geometry-miner-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactOpeningDriveRejectedGeometryMinerCli(args = process.argv.slice(2)): void {
  const options = parseRawOhlcScannerArtifactOpeningDriveRejectedGeometryMinerArgs(args);
  const samebarSeparatorReport = fs.existsSync(options.samebarSeparatorReport)
    ? readJson<RawOhlcScannerArtifactSameBarSeparatorDrilldownReport>(options.samebarSeparatorReport)
    : null;
  const report = buildRawOhlcScannerArtifactOpeningDriveRejectedGeometryMinerReport({
    reportDir: options.outDir,
    samebarSeparatorReportPath: options.samebarSeparatorReport,
    samebarSeparatorReport,
    setupType: options.setupType,
    candidateDirection: options.candidateDirection,
    candidateRiskBucket: options.candidateRiskBucket,
    minBucketRows: options.minBucketRows,
  });
  const paths = writeRawOhlcScannerArtifactOpeningDriveRejectedGeometryMinerReport(report, options.outDir);
  if (options.json) {
    console.log(JSON.stringify({
      ...paths,
      status: report.status,
      summary: report.summary,
      topRejectedBuckets: report.topRejectedBuckets.slice(0, 10),
      otherResolvedCandidateRows: report.otherResolvedCandidateRows,
      blockers: report.blockers,
    }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runRawOhlcScannerArtifactOpeningDriveRejectedGeometryMinerCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
