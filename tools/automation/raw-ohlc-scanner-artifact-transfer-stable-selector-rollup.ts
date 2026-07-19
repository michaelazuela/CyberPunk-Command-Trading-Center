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
  losses: number;
  otherResolved: number;
  unresolved: number;
  oneMesPl: number | null;
  avgRiskPoints: number | null;
}

interface UnresolvedRow {
  ticketId: string;
  tradeDate: string;
  session: string;
  proofTime: string;
  setupType: string;
  direction: string;
  riskPoints: number;
  outcomeLabel: string;
  matchedZeroLossBuckets: string[];
}

export interface RawOhlcScannerArtifactTransferStableSelectorRollupReport {
  reportType: 'raw_ohlc_scanner_artifact_transfer_stable_selector_rollup';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: Authority;
  source: {
    reportDir: string;
    selectorReports: string[];
  };
  assumptions: {
    consumesExistingSelectorReportsOnly: true;
    outcomeFieldsAreEvaluationOnly: true;
    noLiveRankInstalled: true;
    livePromotionAllowed: false;
  };
  summary: {
    selectorReports: number;
    selectedRows: number;
    winners: number;
    losses: number;
    otherResolved: number;
    unresolved: number;
    oneMesPl: number | null;
    livePromotionAllowedRows: 0;
    recommendation: 'fresh_replay_validate_selector' | 'investigate_unresolved_rows' | 'revise_selector' | 'fix_inputs';
  };
  byDaySessionModel: GroupSummary[];
  byModel: GroupSummary[];
  unresolvedRows: UnresolvedRow[];
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

export function parseRawOhlcScannerArtifactTransferStableSelectorRollupArgs(args = process.argv.slice(2)): CliOptions {
  return {
    selectorReports: splitPaths(readFlag(args, '--selector-reports')),
    outDir: readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR,
    json: args.includes('--json'),
  };
}

function isWinner(row: SelectedRow): boolean {
  return row.outcomeStatus === 'resolved' && row.outcomeLabel === 't1_and_t2_hit';
}

function isLoss(row: SelectedRow): boolean {
  return row.outcomeStatus === 'resolved' && row.outcomeLabel === 'stopped_before_t1';
}

function summarize(key: string, rows: SelectedRow[]): GroupSummary {
  return {
    key,
    rows: rows.length,
    winners: rows.filter(isWinner).length,
    losses: rows.filter(isLoss).length,
    otherResolved: rows.filter((row) => row.outcomeStatus === 'resolved' && !isWinner(row) && !isLoss(row)).length,
    unresolved: rows.filter((row) => row.outcomeStatus !== 'resolved').length,
    oneMesPl: sum(rows.map((row) => row.oneMesPl)),
    avgRiskPoints: avg(rows.map((row) => row.riskPoints)),
  };
}

function group(rows: SelectedRow[], keyFn: (row: SelectedRow) => string): GroupSummary[] {
  const groups = new Map<string, SelectedRow[]>();
  for (const row of rows) groups.set(keyFn(row), [...(groups.get(keyFn(row)) || []), row]);
  return [...groups.entries()]
    .map(([key, groupRows]) => summarize(key, groupRows))
    .sort((a, b) => a.key.localeCompare(b.key));
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactTransferStableSelectorRollupReport, 'markdown'>): string {
  return [
    '# Raw-OHLC Transfer-Stable Selector Rollup',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only selector rollup. It reads saved selector reports only and does not install rank behavior, loosen canExecute, post Discord, write Supabase, read the bridge, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Selected W/L/O/U: ${report.summary.winners}/${report.summary.losses}/${report.summary.otherResolved}/${report.summary.unresolved}.`,
    `- One-MES P/L: ${report.summary.oneMesPl ?? 'not available'}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Day / Session / Model',
    '| Key | Rows | W/L/O/U | P/L | Avg Risk |',
    '|---|---:|---|---:|---:|',
    ...report.byDaySessionModel.map((row) => `| ${escapeTable(row.key)} | ${row.rows} | ${row.winners}/${row.losses}/${row.otherResolved}/${row.unresolved} | ${row.oneMesPl ?? '-'} | ${row.avgRiskPoints ?? '-'} |`),
    '',
    '## Model',
    '| Key | Rows | W/L/O/U | P/L | Avg Risk |',
    '|---|---:|---|---:|---:|',
    ...report.byModel.map((row) => `| ${escapeTable(row.key)} | ${row.rows} | ${row.winners}/${row.losses}/${row.otherResolved}/${row.unresolved} | ${row.oneMesPl ?? '-'} | ${row.avgRiskPoints ?? '-'} |`),
    '',
    '## Unresolved Rows',
    '| Ticket | Date | Time | Session | Model | Side | Risk | Outcome | Matched Buckets |',
    '|---|---|---|---|---|---|---:|---|---|',
    ...report.unresolvedRows.map((row) => `| ${escapeTable(row.ticketId)} | ${row.tradeDate} | ${row.proofTime} | ${row.session} | ${row.setupType} | ${row.direction} | ${row.riskPoints} | ${row.outcomeLabel} | ${escapeTable(row.matchedZeroLossBuckets.join('; '))} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactTransferStableSelectorRollupReport(args: {
  reportDir: string;
  selectorReportPaths: string[];
  selectorReports: RawOhlcScannerArtifactTransferStableSelectorSimulationReport[];
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactTransferStableSelectorRollupReport {
  const rows = args.selectorReports.flatMap((report) => report.selectedRows || []);
  const blockers = [
    args.selectorReports.length === 0 ? 'missing selector reports' : null,
    rows.length === 0 ? 'no selected rows found' : null,
    ...args.selectorReports.map((report, index) => report.status !== 'pass' ? `selector report ${args.selectorReportPaths[index]} status ${report.status}` : null),
  ].filter((item): item is string => Boolean(item));
  const summary = summarize('all', rows);
  const base: Omit<RawOhlcScannerArtifactTransferStableSelectorRollupReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_transfer_stable_selector_rollup',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      selectorReports: args.selectorReportPaths,
    },
    assumptions: {
      consumesExistingSelectorReportsOnly: true,
      outcomeFieldsAreEvaluationOnly: true,
      noLiveRankInstalled: true,
      livePromotionAllowed: false,
    },
    summary: {
      selectorReports: args.selectorReports.length,
      selectedRows: summary.rows,
      winners: summary.winners,
      losses: summary.losses,
      otherResolved: summary.otherResolved,
      unresolved: summary.unresolved,
      oneMesPl: summary.oneMesPl,
      livePromotionAllowedRows: 0,
      recommendation: blockers.length
        ? 'fix_inputs'
        : summary.losses > 0
          ? 'revise_selector'
          : summary.unresolved > 0
            ? 'investigate_unresolved_rows'
            : 'fresh_replay_validate_selector',
    },
    byDaySessionModel: group(rows, (row) => `${row.tradeDate}|${row.session}|${row.setupType}`),
    byModel: group(rows, (row) => row.setupType),
    unresolvedRows: rows.filter((row) => row.outcomeStatus !== 'resolved').map((row) => ({
      ticketId: row.ticketId,
      tradeDate: row.tradeDate,
      session: row.session,
      proofTime: row.proofTime,
      setupType: row.setupType,
      direction: row.direction,
      riskPoints: row.riskPoints,
      outcomeLabel: row.outcomeLabel,
      matchedZeroLossBuckets: row.matchedZeroLossBuckets,
    })),
    blockers,
    recommendations: blockers.length
      ? ['Fix selector report inputs before using this rollup.']
      : [
        summary.losses === 0
          ? 'No stopped-before-T1 losses were selected in this saved-report rollup.'
          : 'Stopped-before-T1 rows were selected; revise the selector before any further validation.',
        summary.unresolved > 0
          ? 'Investigate unresolved rows before fresh replay validation because they may be no-fill/on-side cases.'
          : 'Proceed to fresh replay validation with the selected rows only.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactTransferStableSelectorRollupReport(
  report: RawOhlcScannerArtifactTransferStableSelectorRollupReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-transfer-stable-selector-rollup-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactTransferStableSelectorRollupCli(args = process.argv.slice(2)): void {
  const options = parseRawOhlcScannerArtifactTransferStableSelectorRollupArgs(args);
  const report = buildRawOhlcScannerArtifactTransferStableSelectorRollupReport({
    reportDir: options.outDir,
    selectorReportPaths: options.selectorReports,
    selectorReports: options.selectorReports.map((filePath) => readJson<RawOhlcScannerArtifactTransferStableSelectorSimulationReport>(filePath)),
  });
  const paths = writeRawOhlcScannerArtifactTransferStableSelectorRollupReport(report, options.outDir);
  if (options.json) {
    console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, byModel: report.byModel, unresolvedRows: report.unresolvedRows, blockers: report.blockers }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runRawOhlcScannerArtifactTransferStableSelectorRollupCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
