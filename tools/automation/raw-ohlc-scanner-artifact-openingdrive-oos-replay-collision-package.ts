import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  RawOhlcScannerArtifactSameBarSeparatorDrilldownReport,
  RawOhlcScannerArtifactSameBarSeparatorRow,
} from './raw-ohlc-scanner-artifact-samebar-separator-drilldown';

interface CliOptions {
  samebarReports: string[];
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

interface Summary {
  rows: number;
  winners: number;
  losses: number;
  otherResolved: number;
  unresolved: number;
  oneMesPl: number | null;
  avgRiskPoints: number | null;
}

interface OosRow {
  ticketId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: string;
  proofTime: string;
  riskPoints: number;
  outcomeLabel: string;
  outcomeStatus: string;
  oneMesPl: number | null;
  selectorMatched: boolean;
  matchedSelectors: string[];
}

export interface RawOhlcScannerArtifactOpeningDriveOosReplayCollisionPackageReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_oos_replay_collision_package';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: Authority;
  source: {
    samebarReports: string[];
  };
  assumptions: {
    consumesExistingSameBarReportsOnly: true;
    openingDriveOnly: true;
    installedSelectorReplayOnly: true;
    outcomeFieldsAreEvaluationOnly: true;
    noLiveScoringUsed: true;
    noSetupScannerRun: true;
    livePromotionAllowed: false;
  };
  summary: {
    sourceReports: number;
    openingDriveRows: number;
    selectedRows: number;
    rejectedRows: number;
    selectedLosses: number;
    selectedOneMesPl: number | null;
    rejectedLosses: number;
    rejectedOneMesPl: number | null;
    livePromotionAllowedRows: 0;
    recommendation: 'continue_to_collision_comparison' | 'pause_and_investigate' | 'fix_inputs';
  };
  selectedSummary: Summary;
  rejectedSummary: Summary;
  selectedRows: OosRow[];
  rejectedRows: OosRow[];
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

function latestTransferTestSamebarReports(reportDir: string): string[] {
  if (!fs.existsSync(reportDir)) return [];
  const transferReports = fs.readdirSync(reportDir)
    .filter((name) => /^raw-ohlc-scanner-artifact-transfer-stability-miner-\d+\.json$/.test(name))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  for (const filePath of transferReports) {
    const parsed = readJson<{ source?: { testSamebarReports?: string[] } }>(filePath);
    if (parsed.source?.testSamebarReports?.length) return parsed.source.testSamebarReports;
  }
  return [];
}

export function parseRawOhlcScannerArtifactOpeningDriveOosReplayCollisionPackageArgs(args = process.argv.slice(2)): CliOptions {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const samebarReports = splitPaths(readFlag(args, '--samebar-reports'));
  return {
    samebarReports: samebarReports.length ? samebarReports : latestTransferTestSamebarReports(outDir),
    outDir,
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

function riskInRange(risk: number, lower: number, upper: number): boolean {
  return risk >= lower && risk < upper;
}

function installedSelectors(row: RawOhlcScannerArtifactSameBarSeparatorRow): string[] {
  if (row.setupType !== 'OpeningDriveFvgContinuation') return [];
  const selectors: string[] = [];
  if (row.riskPoints >= 24 && row.riskPoints <= 32) selectors.push('fine_risk_24_to_32');
  if (row.direction !== 'LONG' || !riskInRange(row.riskPoints, 4, 8)) return selectors;
  const stamp = new Date(row.proofTime);
  const hour = stamp.getHours();
  const minute = stamp.getMinutes();
  if (riskInRange(row.riskPoints, 4, 5)) selectors.push('tight_long_risk_4_to_5');
  if (riskInRange(row.riskPoints, 4, 4.5)) selectors.push('tight_long_fine_risk_4.0_to_4.5');
  if (riskInRange(row.riskPoints, 4.5, 5)) selectors.push('tight_long_fine_risk_4.5_to_5.0');
  if (riskInRange(row.riskPoints, 5, 5.5)) selectors.push('tight_long_fine_risk_5.0_to_5.5');
  if (riskInRange(row.riskPoints, 7, 7.5)) selectors.push('tight_long_fine_risk_7.0_to_7.5');
  if (minute === 35) selectors.push('tight_long_minute_35');
  if (minute === 55) selectors.push('tight_long_minute_55');
  if (hour === 9 && riskInRange(row.riskPoints, 5, 6)) selectors.push('tight_long_09:00-09:59_risk_5_to_6');
  if (hour === 10 && riskInRange(row.riskPoints, 4, 5)) selectors.push('tight_long_10:00-10:59_risk_4_to_5');
  if (hour === 10 && riskInRange(row.riskPoints, 6, 7)) selectors.push('tight_long_10:00-10:59_risk_6_to_7');
  if (hour === 10 && riskInRange(row.riskPoints, 7, 8)) selectors.push('tight_long_10:00-10:59_risk_7_to_8');
  return Array.from(new Set(selectors));
}

function isWinner(row: Pick<OosRow, 'outcomeStatus' | 'outcomeLabel'>): boolean {
  return row.outcomeStatus === 'resolved' && row.outcomeLabel === 't1_and_t2_hit';
}

function isLoss(row: Pick<OosRow, 'outcomeStatus' | 'outcomeLabel'>): boolean {
  return row.outcomeStatus === 'resolved' && row.outcomeLabel === 'stopped_before_t1';
}

function summarize(rows: OosRow[]): Summary {
  const values = rows.map((row) => row.oneMesPl).filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  const risks = rows.map((row) => row.riskPoints).filter((value) => Number.isFinite(value));
  return {
    rows: rows.length,
    winners: rows.filter(isWinner).length,
    losses: rows.filter(isLoss).length,
    otherResolved: rows.filter((row) => row.outcomeStatus === 'resolved' && !isWinner(row) && !isLoss(row)).length,
    unresolved: rows.filter((row) => row.outcomeStatus !== 'resolved').length,
    oneMesPl: values.length ? round(values.reduce((total, value) => total + value, 0)) : null,
    avgRiskPoints: risks.length ? round(risks.reduce((total, value) => total + value, 0) / risks.length) : null,
  };
}

function toOosRow(row: RawOhlcScannerArtifactSameBarSeparatorRow): OosRow {
  const matchedSelectors = installedSelectors(row);
  return {
    ticketId: row.ticketId,
    tradeDate: row.tradeDate,
    session: row.session,
    setupType: row.setupType,
    direction: row.direction,
    proofTime: row.proofTime,
    riskPoints: row.riskPoints,
    outcomeLabel: row.outcomeLabel,
    outcomeStatus: row.outcomeStatus,
    oneMesPl: row.resolvedOneMesPl,
    selectorMatched: matchedSelectors.length > 0,
    matchedSelectors,
  };
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDriveOosReplayCollisionPackageReport, 'markdown'>): string {
  return [
    '# OpeningDrive OOS Replay Collision Package',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only OOS replay package. It consumes existing same-bar reports only and does not run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- OpeningDrive OOS rows: ${report.summary.openingDriveRows}.`,
    `- Selected rows: ${report.summary.selectedRows}.`,
    `- Selected W/L/O/U/P/L: ${report.selectedSummary.winners}/${report.selectedSummary.losses}/${report.selectedSummary.otherResolved}/${report.selectedSummary.unresolved}/${report.selectedSummary.oneMesPl ?? '-'}.`,
    `- Rejected W/L/O/U/P/L: ${report.rejectedSummary.winners}/${report.rejectedSummary.losses}/${report.rejectedSummary.otherResolved}/${report.rejectedSummary.unresolved}/${report.rejectedSummary.oneMesPl ?? '-'}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDriveOosReplayCollisionPackageReport(args: {
  samebarReports: string[];
  reports: RawOhlcScannerArtifactSameBarSeparatorDrilldownReport[];
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDriveOosReplayCollisionPackageReport {
  const sourceRows = args.reports.flatMap((report) => report.rows || []);
  const rows = sourceRows.filter((row) => row.setupType === 'OpeningDriveFvgContinuation').map(toOosRow);
  const selectedRows = rows.filter((row) => row.selectorMatched);
  const rejectedRows = rows.filter((row) => !row.selectorMatched);
  const selectedSummary = summarize(selectedRows);
  const rejectedSummary = summarize(rejectedRows);
  const blockers = [
    args.samebarReports.length === 0 ? 'no same-bar reports supplied' : null,
    args.reports.some((report) => report.status !== 'pass') ? 'one or more same-bar reports did not pass' : null,
    rows.length === 0 ? 'no OpeningDrive rows found in OOS reports' : null,
    selectedSummary.losses > 0 ? `installed selector picked ${selectedSummary.losses} OOS loss rows` : null,
  ].filter((item): item is string => Boolean(item));
  const recommendation = blockers.length
    ? 'fix_inputs'
    : selectedRows.length > 0 && selectedSummary.losses === 0
      ? 'continue_to_collision_comparison'
      : 'pause_and_investigate';
  const base: Omit<RawOhlcScannerArtifactOpeningDriveOosReplayCollisionPackageReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_oos_replay_collision_package',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      samebarReports: args.samebarReports,
    },
    assumptions: {
      consumesExistingSameBarReportsOnly: true,
      openingDriveOnly: true,
      installedSelectorReplayOnly: true,
      outcomeFieldsAreEvaluationOnly: true,
      noLiveScoringUsed: true,
      noSetupScannerRun: true,
      livePromotionAllowed: false,
    },
    summary: {
      sourceReports: args.reports.length,
      openingDriveRows: rows.length,
      selectedRows: selectedRows.length,
      rejectedRows: rejectedRows.length,
      selectedLosses: selectedSummary.losses,
      selectedOneMesPl: selectedSummary.oneMesPl,
      rejectedLosses: rejectedSummary.losses,
      rejectedOneMesPl: rejectedSummary.oneMesPl,
      livePromotionAllowedRows: 0,
      recommendation,
    },
    selectedSummary,
    rejectedSummary,
    selectedRows,
    rejectedRows,
    blockers,
    recommendations: recommendation === 'continue_to_collision_comparison'
      ? [
        'OOS replay selector package is loss-free. Compare selected rows against prior primary desk idea by day/session/proof event before any further tuning.',
        'Do not broaden to other models from this package alone.',
      ]
      : recommendation === 'pause_and_investigate'
        ? [
          'No selected OOS rows or selected losses were found. Inspect before further scanner-visible changes.',
        ]
        : [
          'Fix input reports before using OOS package evidence.',
        ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function writeReport(report: RawOhlcScannerArtifactOpeningDriveOosReplayCollisionPackageReport, outDir: string): string {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-openingdrive-oos-replay-collision-package-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(outDir, `${base}.md`), `${report.markdown}\n`, 'utf8');
  return jsonPath;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  const options = parseRawOhlcScannerArtifactOpeningDriveOosReplayCollisionPackageArgs();
  const reports = options.samebarReports.map((filePath) => readJson<RawOhlcScannerArtifactSameBarSeparatorDrilldownReport>(filePath));
  const report = buildRawOhlcScannerArtifactOpeningDriveOosReplayCollisionPackageReport({
    samebarReports: options.samebarReports,
    reports,
  });
  const jsonPath = writeReport(report, options.outDir);
  if (options.json) {
    console.log(JSON.stringify({ status: report.status, jsonPath, summary: report.summary, selectedSummary: report.selectedSummary }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nWrote ${jsonPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}
