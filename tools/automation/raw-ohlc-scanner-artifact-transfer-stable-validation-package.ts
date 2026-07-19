import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  RawOhlcScannerArtifactTransferStableSelectorSimulationReport,
} from './raw-ohlc-scanner-artifact-transfer-stable-selector-simulation';

interface CliOptions {
  selectorReports: string[];
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

interface GroupSummary {
  key: string;
  rows: number;
  winners: number;
  otherResolved: number;
  oneMesPl: number | null;
  avgRiskPoints: number | null;
}

interface ValidationRow {
  ticketId: string;
  tradeDate: string;
  session: string;
  proofTime: string;
  setupType: string;
  direction: string;
  riskPoints: number;
  outcomeLabel: string;
  oneMesPl: number | null;
  matchedZeroLossBuckets: string[];
}

interface HeldUnresolvedRow extends ValidationRow {
  outcomeStatus: string;
  researchNote: string;
}

export interface RawOhlcScannerArtifactTransferStableValidationPackageReport {
  reportType: 'raw_ohlc_scanner_artifact_transfer_stable_validation_package';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: Authority;
  source: {
    reportDir: string;
    selectorReports: string[];
  };
  assumptions: {
    consumesExistingSelectorReportsOnly: true;
    packagesResolvedRowsOnly: true;
    unresolvedRowsAreHeldOut: true;
    outcomeFieldsAreEvaluationOnly: true;
    noFreshMarketDataLoaded: true;
    noLiveRankInstalled: true;
    livePromotionAllowed: false;
  };
  summary: {
    selectorReports: number;
    selectedRowsRead: number;
    validationPackageRows: number;
    heldUnresolvedRows: number;
    winners: number;
    otherResolved: number;
    losses: number;
    oneMesPl: number | null;
    livePromotionAllowedRows: 0;
    recommendation: 'run_fresh_replay_validation' | 'revise_selector' | 'fix_inputs';
  };
  byDaySessionModel: GroupSummary[];
  byModel: GroupSummary[];
  validationRows: ValidationRow[];
  heldUnresolvedRows: HeldUnresolvedRow[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');

type SelectedRow = RawOhlcScannerArtifactTransferStableSelectorSimulationReport['selectedRows'][number];

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function splitPaths(value: string | null): string[] {
  return (value || '').split(',').map((item) => item.trim()).filter(Boolean);
}

function latestSelectorReports(reportDir: string): string[] {
  if (!fs.existsSync(reportDir)) return [];
  return fs.readdirSync(reportDir)
    .filter((name) => /^raw-ohlc-scanner-artifact-transfer-stable-selector-simulation-\d+\.json$/.test(name))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)
    .slice(0, 2)
    .sort();
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
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

export function parseRawOhlcScannerArtifactTransferStableValidationPackageArgs(args = process.argv.slice(2)): CliOptions {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  return {
    selectorReports: splitPaths(readFlag(args, '--selector-reports')).length
      ? splitPaths(readFlag(args, '--selector-reports'))
      : latestSelectorReports(outDir),
    outDir,
    json: args.includes('--json'),
  };
}

function isWinner(row: SelectedRow | ValidationRow): boolean {
  return row.outcomeLabel === 't1_and_t2_hit';
}

function isLoss(row: SelectedRow | ValidationRow): boolean {
  return row.outcomeLabel === 'stopped_before_t1';
}

function toValidationRow(row: SelectedRow): ValidationRow {
  return {
    ticketId: row.ticketId,
    tradeDate: row.tradeDate,
    session: row.session,
    proofTime: row.proofTime,
    setupType: row.setupType,
    direction: row.direction,
    riskPoints: row.riskPoints,
    outcomeLabel: row.outcomeLabel,
    oneMesPl: row.oneMesPl,
    matchedZeroLossBuckets: row.matchedZeroLossBuckets,
  };
}

function toHeldUnresolvedRow(row: SelectedRow): HeldUnresolvedRow {
  return {
    ...toValidationRow(row),
    outcomeStatus: row.outcomeStatus,
    researchNote: 'Held out of the fresh validation package until replay resolves target/stop or confirms no-follow-through behavior.',
  };
}

function summarize(key: string, rows: ValidationRow[]): GroupSummary {
  return {
    key,
    rows: rows.length,
    winners: rows.filter(isWinner).length,
    otherResolved: rows.filter((row) => !isWinner(row) && !isLoss(row)).length,
    oneMesPl: sum(rows.map((row) => row.oneMesPl)),
    avgRiskPoints: avg(rows.map((row) => row.riskPoints)),
  };
}

function group(rows: ValidationRow[], keyFn: (row: ValidationRow) => string): GroupSummary[] {
  const groups = new Map<string, ValidationRow[]>();
  for (const row of rows) groups.set(keyFn(row), [...(groups.get(keyFn(row)) || []), row]);
  return [...groups.entries()]
    .map(([key, groupRows]) => summarize(key, groupRows))
    .sort((a, b) => a.key.localeCompare(b.key));
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactTransferStableValidationPackageReport, 'markdown'>): string {
  return [
    '# Raw-OHLC Transfer-Stable Validation Package',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only validation package. It reads saved selector reports only and does not run setupScanner, post Discord, write Supabase, read the bridge, install rank behavior, loosen canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Selected rows read: ${report.summary.selectedRowsRead}.`,
    `- Validation package rows: ${report.summary.validationPackageRows}.`,
    `- Held unresolved rows: ${report.summary.heldUnresolvedRows}.`,
    `- Package W/L/O: ${report.summary.winners}/${report.summary.losses}/${report.summary.otherResolved}.`,
    `- Package one-MES P/L: ${report.summary.oneMesPl ?? 'not available'}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    '',
    '## Day / Session / Model',
    '| Key | Rows | W/O | P/L | Avg Risk |',
    '|---|---:|---|---:|---:|',
    ...report.byDaySessionModel.map((row) => `| ${escapeTable(row.key)} | ${row.rows} | ${row.winners}/${row.otherResolved} | ${row.oneMesPl ?? '-'} | ${row.avgRiskPoints ?? '-'} |`),
    '',
    '## Held Unresolved Rows',
    '| Ticket | Date | Time | Session | Model | Side | Risk | Outcome |',
    '|---|---|---|---|---|---|---:|---|',
    ...report.heldUnresolvedRows.map((row) => `| ${escapeTable(row.ticketId)} | ${row.tradeDate} | ${row.proofTime} | ${row.session} | ${row.setupType} | ${row.direction} | ${row.riskPoints} | ${row.outcomeLabel} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactTransferStableValidationPackageReport(args: {
  reportDir: string;
  selectorReportPaths: string[];
  selectorReports: RawOhlcScannerArtifactTransferStableSelectorSimulationReport[];
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactTransferStableValidationPackageReport {
  const selectedRows = args.selectorReports.flatMap((report) => report.selectedRows || []);
  const validationRows = selectedRows
    .filter((row) => row.outcomeStatus === 'resolved')
    .map(toValidationRow)
    .sort((a, b) => `${a.tradeDate}-${a.session}-${a.proofTime}-${a.setupType}-${a.direction}`.localeCompare(`${b.tradeDate}-${b.session}-${b.proofTime}-${b.setupType}-${b.direction}`));
  const heldUnresolvedRows = selectedRows
    .filter((row) => row.outcomeStatus !== 'resolved')
    .map(toHeldUnresolvedRow)
    .sort((a, b) => `${a.tradeDate}-${a.session}-${a.proofTime}-${a.setupType}-${a.direction}`.localeCompare(`${b.tradeDate}-${b.session}-${b.proofTime}-${b.setupType}-${b.direction}`));
  const losses = validationRows.filter(isLoss).length;
  const blockers = [
    args.selectorReports.length === 0 ? 'missing selector reports' : null,
    selectedRows.length === 0 ? 'no selected rows found' : null,
    validationRows.length === 0 ? 'no resolved validation rows found' : null,
    ...args.selectorReports.map((report, index) => report.status !== 'pass' ? `selector report ${args.selectorReportPaths[index]} status ${report.status}` : null),
  ].filter((item): item is string => Boolean(item));
  const base: Omit<RawOhlcScannerArtifactTransferStableValidationPackageReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_transfer_stable_validation_package',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      selectorReports: args.selectorReportPaths,
    },
    assumptions: {
      consumesExistingSelectorReportsOnly: true,
      packagesResolvedRowsOnly: true,
      unresolvedRowsAreHeldOut: true,
      outcomeFieldsAreEvaluationOnly: true,
      noFreshMarketDataLoaded: true,
      noLiveRankInstalled: true,
      livePromotionAllowed: false,
    },
    summary: {
      selectorReports: args.selectorReports.length,
      selectedRowsRead: selectedRows.length,
      validationPackageRows: validationRows.length,
      heldUnresolvedRows: heldUnresolvedRows.length,
      winners: validationRows.filter(isWinner).length,
      otherResolved: validationRows.filter((row) => !isWinner(row) && !isLoss(row)).length,
      losses,
      oneMesPl: sum(validationRows.map((row) => row.oneMesPl)),
      livePromotionAllowedRows: 0,
      recommendation: blockers.length
        ? 'fix_inputs'
        : losses === 0
          ? 'run_fresh_replay_validation'
          : 'revise_selector',
    },
    byDaySessionModel: group(validationRows, (row) => `${row.tradeDate}|${row.session}|${row.setupType}`),
    byModel: group(validationRows, (row) => row.setupType),
    validationRows,
    heldUnresolvedRows,
    blockers,
    recommendations: blockers.length
      ? ['Fix selector report inputs before building a fresh validation package.']
      : [
        losses === 0
          ? 'Run a fresh replay validation over these resolved selected rows before any scanner-visible proposal.'
          : 'Do not validate live-facing behavior; selected resolved rows include stopped-before-T1 losses.',
        heldUnresolvedRows.length
          ? 'Keep unresolved rows separate as no-follow-through research notes until a replay window resolves them.'
          : 'No unresolved selector rows are held out.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactTransferStableValidationPackageReport(
  report: RawOhlcScannerArtifactTransferStableValidationPackageReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-transfer-stable-validation-package-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactTransferStableValidationPackageCli(args = process.argv.slice(2)): void {
  const options = parseRawOhlcScannerArtifactTransferStableValidationPackageArgs(args);
  const report = buildRawOhlcScannerArtifactTransferStableValidationPackageReport({
    reportDir: options.outDir,
    selectorReportPaths: options.selectorReports,
    selectorReports: options.selectorReports.map((filePath) => readJson<RawOhlcScannerArtifactTransferStableSelectorSimulationReport>(filePath)),
  });
  const paths = writeRawOhlcScannerArtifactTransferStableValidationPackageReport(report, options.outDir);
  if (options.json) {
    console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, byModel: report.byModel, heldUnresolvedRows: report.heldUnresolvedRows, blockers: report.blockers }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runRawOhlcScannerArtifactTransferStableValidationPackageCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
