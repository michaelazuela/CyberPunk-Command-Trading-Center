import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  RawOhlcScannerArtifactSameBarSeparatorDrilldownReport,
  RawOhlcScannerArtifactSameBarSeparatorRow,
} from './raw-ohlc-scanner-artifact-samebar-separator-drilldown';

interface CliOptions {
  reportDir: string;
  setupType: string;
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

interface DrilldownRow {
  ticketId: string;
  tradeDate: string;
  session: string;
  direction: string;
  outcomeLabel: string;
  outcomeStatus: string;
  resolvedOneMesPl: number | null;
  proofTime: string;
  entryHitTime: string | null;
  firstReplayBarTime: string | null;
  stopHitTime: string | null;
  t1HitTime: string | null;
  t2HitTime: string | null;
  riskPoints: number;
  mfeR: number | null;
  maeR: number | null;
  timeBucket: string;
  hourBucket: string;
  riskBucket: string;
  separatorTags: string[];
  sourceReportPath: string;
}

interface BucketSummary {
  bucketType: string;
  key: string;
  rows: number;
  winners: number;
  losses: number;
  oneMesPl: number | null;
}

export interface RawOhlcScannerArtifactOpeningDriveLowRiskLossDrilldownReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_low_risk_loss_drilldown';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: Authority;
  source: {
    reportDir: string;
    setupType: string;
    samebarReportPaths: string[];
  };
  assumptions: {
    savedReportsOnly: true;
    lowRiskRowsOnly: true;
    dedupesByTicketId: true;
    outcomeFieldsAreEvaluationOnly: true;
    scannerVisibleInstallAllowedNow: false;
    livePromotionAllowed: false;
  };
  summary: {
    sourceReports: number;
    lowRiskRows: number;
    winners: number;
    losses: number;
    oneMesPl: number | null;
    lossRowsHaveSharedSeparatorTags: boolean;
    livePromotionAllowedRows: 0;
    recommendation: 'mine_loss_separator' | 'do_not_promote_low_risk_broadly' | 'fix_inputs';
  };
  lossRows: DrilldownRow[];
  winnerRows: DrilldownRow[];
  bucketSummaries: BucketSummary[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const DEFAULT_SETUP_TYPE = 'NoInstalledSetup';

type RowWithSource = RawOhlcScannerArtifactSameBarSeparatorRow & {
  sourceReportPath: string;
  sourceReportMtimeMs: number;
};

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

export function parseRawOhlcScannerArtifactOpeningDriveLowRiskLossDrilldownArgs(args = process.argv.slice(2)): CliOptions {
  const reportDir = readFlag(args, '--report-dir') || DEFAULT_REPORT_DIR;
  return {
    reportDir,
    setupType: readFlag(args, '--setup-type') || DEFAULT_SETUP_TYPE,
    outDir: readFlag(args, '--out-dir') || reportDir,
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

function listSamebarReports(reportDir: string): string[] {
  if (!fs.existsSync(reportDir)) return [];
  const entries = fs.readdirSync(reportDir, { withFileTypes: true });
  return [
    ...entries
      .filter((entry) => entry.isFile() && /^raw-ohlc-scanner-artifact-samebar-separator-drilldown-\d+\.json$/.test(entry.name))
      .map((entry) => path.join(reportDir, entry.name)),
    ...entries
      .filter((entry) => entry.isDirectory())
      .flatMap((entry) => listSamebarReports(path.join(reportDir, entry.name))),
  ].sort();
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function isWinner(row: { outcomeStatus: string; outcomeLabel: string }): boolean {
  return row.outcomeStatus === 'resolved' && row.outcomeLabel === 't1_and_t2_hit';
}

function isLoss(row: { outcomeStatus: string; outcomeLabel: string }): boolean {
  return row.outcomeStatus === 'resolved' && row.outcomeLabel === 'stopped_before_t1';
}

function sum(rows: Array<{ resolvedOneMesPl: number | null }>): number | null {
  const values = rows.map((row) => row.resolvedOneMesPl).filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return values.length ? round(values.reduce((total, value) => total + value, 0)) : null;
}

function lowRisk(row: RawOhlcScannerArtifactSameBarSeparatorRow): boolean {
  return row.riskPoints < 4;
}

function riskBucket(riskPoints: number): string {
  if (riskPoints < 1) return 'risk_lt_1';
  if (riskPoints < 2) return 'risk_1_to_2';
  if (riskPoints < 3) return 'risk_2_to_3';
  return 'risk_3_to_4';
}

function hourBucket(proofTime: string): string {
  const date = new Date(proofTime);
  if (Number.isNaN(date.getTime())) return 'unknown';
  const hour = date.getHours().toString().padStart(2, '0');
  return `${hour}:00-${hour}:59`;
}

function dedupe(rows: RowWithSource[]): RowWithSource[] {
  const byTicket = new Map<string, RowWithSource>();
  for (const row of rows) {
    const existing = byTicket.get(row.ticketId);
    if (!existing || row.sourceReportMtimeMs > existing.sourceReportMtimeMs) byTicket.set(row.ticketId, row);
  }
  return [...byTicket.values()].sort((a, b) => `${a.tradeDate}|${a.proofTime}|${a.ticketId}`.localeCompare(`${b.tradeDate}|${b.proofTime}|${b.ticketId}`));
}

function toDrilldownRow(row: RowWithSource): DrilldownRow {
  return {
    ticketId: row.ticketId,
    tradeDate: row.tradeDate,
    session: row.session,
    direction: row.direction,
    outcomeLabel: row.outcomeLabel,
    outcomeStatus: row.outcomeStatus,
    resolvedOneMesPl: row.resolvedOneMesPl,
    proofTime: row.proofTime,
    entryHitTime: row.entryHitTime,
    firstReplayBarTime: row.firstReplayBarTime,
    stopHitTime: row.stopHitTime,
    t1HitTime: row.t1HitTime,
    t2HitTime: row.t2HitTime,
    riskPoints: row.riskPoints,
    mfeR: row.mfeR,
    maeR: row.maeR,
    timeBucket: row.timeBucket,
    hourBucket: hourBucket(row.proofTime),
    riskBucket: riskBucket(row.riskPoints),
    separatorTags: row.separatorTags,
    sourceReportPath: row.sourceReportPath,
  };
}

function bucket(rows: DrilldownRow[], bucketType: string, keyFor: (row: DrilldownRow) => string): BucketSummary[] {
  const groups = new Map<string, DrilldownRow[]>();
  for (const row of rows) groups.set(keyFor(row), [...(groups.get(keyFor(row)) || []), row]);
  return [...groups.entries()]
    .map(([key, group]) => ({
      bucketType,
      key,
      rows: group.length,
      winners: group.filter(isWinner).length,
      losses: group.filter(isLoss).length,
      oneMesPl: sum(group),
    }))
    .sort((a, b) => b.losses - a.losses || b.rows - a.rows || a.key.localeCompare(b.key));
}

function sharedLossTags(lossRows: DrilldownRow[]): string[] {
  if (!lossRows.length) return [];
  return lossRows
    .map((row) => row.separatorTags)
    .reduce((shared, tags) => shared.filter((tag) => tags.includes(tag)));
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDriveLowRiskLossDrilldownReport, 'markdown'>): string {
  return [
    '# OpeningDrive Low-Risk Loss Drilldown',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only loss drilldown. It does not install scanner-visible ranking, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Low-risk rows W/L/P/L: ${report.summary.lowRiskRows}/${report.summary.winners}/${report.summary.losses}/${report.summary.oneMesPl ?? '-'}.`,
    `- Loss rows have shared replay/outcome separator tags: ${report.summary.lossRowsHaveSharedSeparatorTags}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Loss Rows',
    '| Ticket | Date | Dir | Proof | Risk | MFE/MAE R | P/L | Tags |',
    '|---|---|---|---|---:|---|---:|---|',
    ...report.lossRows.map((row) => `| ${row.ticketId} | ${row.tradeDate} | ${row.direction} | ${row.proofTime} | ${row.riskPoints} | ${row.mfeR ?? '-'}/${row.maeR ?? '-'} | ${row.resolvedOneMesPl ?? '-'} | ${row.separatorTags.join(', ')} |`),
    '',
    '## Buckets',
    '| Bucket | Key | Rows | W/L | P/L |',
    '|---|---|---:|---|---:|',
    ...report.bucketSummaries.map((row) => `| ${row.bucketType} | ${row.key} | ${row.rows} | ${row.winners}/${row.losses} | ${row.oneMesPl ?? '-'} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDriveLowRiskLossDrilldownReport(args: {
  reportDir: string;
  setupType: string;
  reports: Array<{ filePath: string; mtimeMs: number; report: RawOhlcScannerArtifactSameBarSeparatorDrilldownReport }>;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDriveLowRiskLossDrilldownReport {
  const sourceRows = args.reports.flatMap((item) =>
    item.report.rows
      .filter((row) => row.setupType === args.setupType && lowRisk(row))
      .map((row) => ({ ...row, sourceReportPath: item.filePath, sourceReportMtimeMs: item.mtimeMs })),
  );
  const lowRiskRows = dedupe(sourceRows).map(toDrilldownRow);
  const lossRows = lowRiskRows.filter(isLoss);
  const winnerRows = lowRiskRows.filter(isWinner);
  const sharedTags = sharedLossTags(lossRows);
  const blockers = [
    !args.reports.length ? 'no same-bar separator reports found' : null,
    !sourceRows.length ? `no low-risk ${args.setupType} rows found` : null,
  ].filter((item): item is string => Boolean(item));
  const base: Omit<RawOhlcScannerArtifactOpeningDriveLowRiskLossDrilldownReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_low_risk_loss_drilldown',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      setupType: args.setupType,
      samebarReportPaths: args.reports.map((item) => item.filePath),
    },
    assumptions: {
      savedReportsOnly: true,
      lowRiskRowsOnly: true,
      dedupesByTicketId: true,
      outcomeFieldsAreEvaluationOnly: true,
      scannerVisibleInstallAllowedNow: false,
      livePromotionAllowed: false,
    },
    summary: {
      sourceReports: args.reports.length,
      lowRiskRows: lowRiskRows.length,
      winners: winnerRows.length,
      losses: lossRows.length,
      oneMesPl: sum(lowRiskRows),
      lossRowsHaveSharedSeparatorTags: sharedTags.length > 0,
      livePromotionAllowedRows: 0,
      recommendation: blockers.length
        ? 'fix_inputs'
        : lossRows.length
          ? 'mine_loss_separator'
          : 'do_not_promote_low_risk_broadly',
    },
    lossRows,
    winnerRows,
    bucketSummaries: [
      ...bucket(lowRiskRows, 'direction', (row) => row.direction),
      ...bucket(lowRiskRows, 'hourBucket', (row) => row.hourBucket),
      ...bucket(lowRiskRows, 'riskBucket', (row) => row.riskBucket),
      ...bucket(lowRiskRows, 'timeBucket', (row) => row.timeBucket),
      ...bucket(lowRiskRows, 'separatorTag', (row) => row.separatorTags.join('|') || 'none'),
    ],
    blockers,
    recommendations: blockers.length
      ? ['Fix saved report inputs before using this loss drilldown.']
      : [
        lossRows.length
          ? 'Low-risk has loss residue; mine a no-lookahead separator before any proposal and do not promote low-risk broadly.'
          : 'No low-risk losses found in this saved sample; still require collision/priority contract before proposal work.',
        'Do not install scanner-visible ranking, Discord, Supabase, bridge, canExecute, entry, stop, target, risk, scanner runtime, or trading-rule changes from this drilldown.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function loadRawOhlcScannerArtifactOpeningDriveLowRiskLossDrilldownReports(reportDir: string) {
  return listSamebarReports(reportDir)
    .map((filePath) => ({
      filePath,
      mtimeMs: fs.statSync(filePath).mtimeMs,
      report: readJson<RawOhlcScannerArtifactSameBarSeparatorDrilldownReport>(filePath),
    }))
    .filter((item) => item.report.status === 'pass');
}

export function writeRawOhlcScannerArtifactOpeningDriveLowRiskLossDrilldownReport(
  report: RawOhlcScannerArtifactOpeningDriveLowRiskLossDrilldownReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-openingdrive-low-risk-loss-drilldown-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactOpeningDriveLowRiskLossDrilldownCli(args = process.argv.slice(2)): void {
  const options = parseRawOhlcScannerArtifactOpeningDriveLowRiskLossDrilldownArgs(args);
  const report = buildRawOhlcScannerArtifactOpeningDriveLowRiskLossDrilldownReport({
    reportDir: options.reportDir,
    setupType: options.setupType,
    reports: loadRawOhlcScannerArtifactOpeningDriveLowRiskLossDrilldownReports(options.reportDir),
  });
  const paths = writeRawOhlcScannerArtifactOpeningDriveLowRiskLossDrilldownReport(report, options.outDir);
  if (options.json) console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, lossRows: report.lossRows, bucketSummaries: report.bucketSummaries, blockers: report.blockers }, null, 2));
  else { console.log(report.markdown); console.log(`\nReport JSON: ${paths.jsonPath}`); console.log(`Report Markdown: ${paths.markdownPath}`); }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try { runRawOhlcScannerArtifactOpeningDriveLowRiskLossDrilldownCli(); } catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}
