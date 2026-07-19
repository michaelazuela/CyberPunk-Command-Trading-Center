import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

interface CliOptions {
  outcomeReports: string[];
  samebarReports: string[];
  openingDriveSelectorReports: string[];
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

interface OutcomeDaySessionModelGroup {
  tradeDate: string;
  session: string;
  setupType: string;
  rows: number;
  resolvedRows: number;
  unresolvedRows: number;
  blockedRows: number;
  grossResolvedOneMesPl: number | null;
}

interface OutcomeReport {
  status: 'pass' | 'fail';
  summary: {
    packageRows: number;
    resolvedRows: number;
    unresolvedRows: number;
    blockedRows: number;
    grossResolvedOneMesPl: number | null;
    daySessionModelGroups: OutcomeDaySessionModelGroup[];
    livePromotionAllowedRows: number;
  };
}

interface SameBarReport {
  status: 'pass' | 'fail';
  summary: {
    sameBarRows: number;
    winners: number;
    losses: number;
    unresolved: number;
    grossOneMesPl: number | null;
    livePromotionAllowedRows: number;
  };
}

interface SelectorBucketSummary {
  rows: number;
  winners: number;
  losses: number;
  otherResolved: number;
  unresolved: number;
  oneMesPl: number | null;
  avgRiskPoints: number | null;
}

interface OpeningDriveSelectorReport {
  status: 'pass' | 'fail';
  source: {
    samebarSeparatorReportPath: string | null;
    setupType: string;
  };
  summary: {
    sourceRows: number;
    proofEvents: number;
    selectedRows: number;
    rejectedRows: number;
    collisionEvents: number;
    selectedSummary: SelectorBucketSummary;
    rejectedSummary: SelectorBucketSummary;
    livePromotionAllowedRows: number;
  };
}

interface AggregateModelSummary {
  setupType: string;
  rows: number;
  resolvedRows: number;
  unresolvedRows: number;
  blockedRows: number;
  grossResolvedOneMesPl: number | null;
}

interface AggregateSessionSummary extends AggregateModelSummary {
  session: string;
}

export interface RawOhlcScannerArtifactJulyHtfReadyRollupReport {
  reportType: 'raw_ohlc_scanner_artifact_july_htf_ready_rollup';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: Authority;
  source: {
    outcomeReports: string[];
    samebarReports: string[];
    openingDriveSelectorReports: string[];
  };
  assumptions: {
    consumesExistingLocalReportsOnly: true;
    readOnlyPostProcessor: true;
    outcomeFieldsAreEvaluationOnly: true;
    livePromotionAllowed: false;
  };
  summary: {
    outcomeReports: number;
    samebarReports: number;
    openingDriveSelectorReports: number;
    packageRows: number;
    resolvedRows: number;
    unresolvedRows: number;
    blockedRows: number;
    grossResolvedOneMesPl: number | null;
    sameBarRows: number;
    sameBarWinners: number;
    sameBarLosses: number;
    sameBarUnresolved: number;
    sameBarGrossOneMesPl: number | null;
    openingDriveSourceRows: number;
    openingDriveSelectedRows: number;
    openingDriveSelectedWinners: number;
    openingDriveSelectedLosses: number;
    openingDriveSelectedOtherResolved: number;
    openingDriveSelectedUnresolved: number;
    openingDriveSelectedOneMesPl: number | null;
    livePromotionAllowedRows: 0;
  };
  daySessionModelGroups: OutcomeDaySessionModelGroup[];
  modelSummaries: AggregateModelSummary[];
  sessionModelSummaries: AggregateSessionSummary[];
  openingDriveSelectorVerdict: 'reject_live_promotion' | 'continue_research';
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

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function addNullable(a: number | null, b: number | null): number | null {
  if (a === null && b === null) return null;
  return round((a || 0) + (b || 0));
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

export function parseRawOhlcScannerArtifactJulyHtfReadyRollupArgs(args = process.argv.slice(2)): CliOptions {
  return {
    outcomeReports: splitPaths(readFlag(args, '--outcome-reports')),
    samebarReports: splitPaths(readFlag(args, '--samebar-reports')),
    openingDriveSelectorReports: splitPaths(readFlag(args, '--openingdrive-selector-reports')),
    outDir: readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR,
    json: args.includes('--json'),
  };
}

function aggregateGroups(groups: OutcomeDaySessionModelGroup[], keyFor: (group: OutcomeDaySessionModelGroup) => string): AggregateModelSummary[] {
  const map = new Map<string, AggregateModelSummary>();
  for (const group of groups) {
    const key = keyFor(group);
    const current = map.get(key) || {
      setupType: group.setupType,
      rows: 0,
      resolvedRows: 0,
      unresolvedRows: 0,
      blockedRows: 0,
      grossResolvedOneMesPl: null,
    };
    current.rows += group.rows;
    current.resolvedRows += group.resolvedRows;
    current.unresolvedRows += group.unresolvedRows;
    current.blockedRows += group.blockedRows;
    current.grossResolvedOneMesPl = addNullable(current.grossResolvedOneMesPl, group.grossResolvedOneMesPl);
    map.set(key, current);
  }
  return [...map.values()].sort((a, b) => (b.grossResolvedOneMesPl || 0) - (a.grossResolvedOneMesPl || 0));
}

function aggregateSessionGroups(groups: OutcomeDaySessionModelGroup[]): AggregateSessionSummary[] {
  const map = new Map<string, AggregateSessionSummary>();
  for (const group of groups) {
    const key = `${group.session}|${group.setupType}`;
    const current = map.get(key) || {
      session: group.session,
      setupType: group.setupType,
      rows: 0,
      resolvedRows: 0,
      unresolvedRows: 0,
      blockedRows: 0,
      grossResolvedOneMesPl: null,
    };
    current.rows += group.rows;
    current.resolvedRows += group.resolvedRows;
    current.unresolvedRows += group.unresolvedRows;
    current.blockedRows += group.blockedRows;
    current.grossResolvedOneMesPl = addNullable(current.grossResolvedOneMesPl, group.grossResolvedOneMesPl);
    map.set(key, current);
  }
  return [...map.values()].sort((a, b) => (b.grossResolvedOneMesPl || 0) - (a.grossResolvedOneMesPl || 0));
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactJulyHtfReadyRollupReport, 'markdown'>): string {
  return [
    '# July HTF-Ready Replay Rollup',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only research rollup. It does not post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change trading logic, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Outcome reports: ${report.summary.outcomeReports}.`,
    `- Package rows/resolved/unresolved: ${report.summary.packageRows}/${report.summary.resolvedRows}/${report.summary.unresolvedRows}.`,
    `- Gross resolved one-MES P/L: ${report.summary.grossResolvedOneMesPl ?? 'not available'}.`,
    `- Same-bar W/L/U: ${report.summary.sameBarWinners}/${report.summary.sameBarLosses}/${report.summary.sameBarUnresolved}.`,
    `- Same-bar one-MES P/L: ${report.summary.sameBarGrossOneMesPl ?? 'not available'}.`,
    `- OpeningDrive selected W/L/O/U: ${report.summary.openingDriveSelectedWinners}/${report.summary.openingDriveSelectedLosses}/${report.summary.openingDriveSelectedOtherResolved}/${report.summary.openingDriveSelectedUnresolved}.`,
    `- OpeningDrive selected one-MES P/L: ${report.summary.openingDriveSelectedOneMesPl ?? 'not available'}.`,
    `- OpeningDrive selector verdict: ${report.openingDriveSelectorVerdict}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    '',
    '## Model P/L',
    '| Model | Rows | Resolved | Unresolved | P/L |',
    '|---|---:|---:|---:|---:|',
    ...report.modelSummaries.map((row) => `| ${escapeTable(row.setupType)} | ${row.rows} | ${row.resolvedRows} | ${row.unresolvedRows} | ${row.grossResolvedOneMesPl ?? '-'} |`),
    '',
    '## Session Model P/L',
    '| Session | Model | Rows | Resolved | Unresolved | P/L |',
    '|---|---|---:|---:|---:|---:|',
    ...report.sessionModelSummaries.map((row) => `| ${row.session} | ${escapeTable(row.setupType)} | ${row.rows} | ${row.resolvedRows} | ${row.unresolvedRows} | ${row.grossResolvedOneMesPl ?? '-'} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactJulyHtfReadyRollupReport(args: {
  outcomeReports: OutcomeReport[];
  outcomeReportPaths: string[];
  samebarReports: SameBarReport[];
  samebarReportPaths: string[];
  openingDriveSelectorReports: OpeningDriveSelectorReport[];
  openingDriveSelectorReportPaths: string[];
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactJulyHtfReadyRollupReport {
  const daySessionModelGroups = args.outcomeReports.flatMap((report) => report.summary.daySessionModelGroups || []);
  const openingDriveSelectedSummary = args.openingDriveSelectorReports.reduce((total, report) => ({
    rows: total.rows + report.summary.selectedSummary.rows,
    winners: total.winners + report.summary.selectedSummary.winners,
    losses: total.losses + report.summary.selectedSummary.losses,
    otherResolved: total.otherResolved + report.summary.selectedSummary.otherResolved,
    unresolved: total.unresolved + report.summary.selectedSummary.unresolved,
    oneMesPl: addNullable(total.oneMesPl, report.summary.selectedSummary.oneMesPl),
    avgRiskPoints: null,
  }), { rows: 0, winners: 0, losses: 0, otherResolved: 0, unresolved: 0, oneMesPl: null, avgRiskPoints: null } as SelectorBucketSummary);
  const blockers = [
    args.outcomeReports.length === 0 ? 'missing outcome reports' : null,
    ...args.outcomeReports.map((report, index) => report.status !== 'pass' ? `outcome report ${args.outcomeReportPaths[index]} status ${report.status}` : null),
    ...args.samebarReports.map((report, index) => report.status !== 'pass' ? `same-bar report ${args.samebarReportPaths[index]} status ${report.status}` : null),
    ...args.openingDriveSelectorReports.map((report, index) => report.status !== 'pass' ? `OpeningDrive selector report ${args.openingDriveSelectorReportPaths[index]} status ${report.status}` : null),
  ].filter((item): item is string => Boolean(item));
  const summary = {
    outcomeReports: args.outcomeReports.length,
    samebarReports: args.samebarReports.length,
    openingDriveSelectorReports: args.openingDriveSelectorReports.length,
    packageRows: args.outcomeReports.reduce((total, report) => total + report.summary.packageRows, 0),
    resolvedRows: args.outcomeReports.reduce((total, report) => total + report.summary.resolvedRows, 0),
    unresolvedRows: args.outcomeReports.reduce((total, report) => total + report.summary.unresolvedRows, 0),
    blockedRows: args.outcomeReports.reduce((total, report) => total + report.summary.blockedRows, 0),
    grossResolvedOneMesPl: args.outcomeReports.reduce((total, report) => addNullable(total, report.summary.grossResolvedOneMesPl), null as number | null),
    sameBarRows: args.samebarReports.reduce((total, report) => total + report.summary.sameBarRows, 0),
    sameBarWinners: args.samebarReports.reduce((total, report) => total + report.summary.winners, 0),
    sameBarLosses: args.samebarReports.reduce((total, report) => total + report.summary.losses, 0),
    sameBarUnresolved: args.samebarReports.reduce((total, report) => total + report.summary.unresolved, 0),
    sameBarGrossOneMesPl: args.samebarReports.reduce((total, report) => addNullable(total, report.summary.grossOneMesPl), null as number | null),
    openingDriveSourceRows: args.openingDriveSelectorReports.reduce((total, report) => total + report.summary.sourceRows, 0),
    openingDriveSelectedRows: openingDriveSelectedSummary.rows,
    openingDriveSelectedWinners: openingDriveSelectedSummary.winners,
    openingDriveSelectedLosses: openingDriveSelectedSummary.losses,
    openingDriveSelectedOtherResolved: openingDriveSelectedSummary.otherResolved,
    openingDriveSelectedUnresolved: openingDriveSelectedSummary.unresolved,
    openingDriveSelectedOneMesPl: openingDriveSelectedSummary.oneMesPl,
    livePromotionAllowedRows: 0 as const,
  };
  const openingDriveSelectorVerdict = summary.openingDriveSelectedLosses > 0 ? 'reject_live_promotion' : 'continue_research';
  const base: Omit<RawOhlcScannerArtifactJulyHtfReadyRollupReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_july_htf_ready_rollup',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      outcomeReports: args.outcomeReportPaths,
      samebarReports: args.samebarReportPaths,
      openingDriveSelectorReports: args.openingDriveSelectorReportPaths,
    },
    assumptions: {
      consumesExistingLocalReportsOnly: true,
      readOnlyPostProcessor: true,
      outcomeFieldsAreEvaluationOnly: true,
      livePromotionAllowed: false,
    },
    summary,
    daySessionModelGroups,
    modelSummaries: aggregateGroups(daySessionModelGroups, (group) => group.setupType),
    sessionModelSummaries: aggregateSessionGroups(daySessionModelGroups),
    openingDriveSelectorVerdict,
    blockers,
    recommendations: blockers.length
      ? ['Fix the input report set before using this rollup for research decisions.']
      : [
        openingDriveSelectorVerdict === 'reject_live_promotion'
          ? 'Do not promote the current OpeningDrive combined selector; July HTF-ready validation is loss-bearing.'
          : 'Keep the current OpeningDrive selector research-only and validate on another independent HTF-ready set.',
        'Next narrow phase should build a unified research ranker that compares all candidate models by session, direction, proof timing, risk, HTF/proof source, and blocked/no-fill/stopped-before-T1 history.',
        'No Discord, Supabase, NinjaTrader bridge, canExecute, entry/stop/target/risk, or trading-rule change is approved by this rollup.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactJulyHtfReadyRollupReport(
  report: RawOhlcScannerArtifactJulyHtfReadyRollupReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-july-htf-ready-rollup-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactJulyHtfReadyRollupCli(args = process.argv.slice(2)): void {
  const options = parseRawOhlcScannerArtifactJulyHtfReadyRollupArgs(args);
  const report = buildRawOhlcScannerArtifactJulyHtfReadyRollupReport({
    outcomeReportPaths: options.outcomeReports,
    outcomeReports: options.outcomeReports.map((filePath) => readJson<OutcomeReport>(filePath)),
    samebarReportPaths: options.samebarReports,
    samebarReports: options.samebarReports.map((filePath) => readJson<SameBarReport>(filePath)),
    openingDriveSelectorReportPaths: options.openingDriveSelectorReports,
    openingDriveSelectorReports: options.openingDriveSelectorReports.map((filePath) => readJson<OpeningDriveSelectorReport>(filePath)),
  });
  const paths = writeRawOhlcScannerArtifactJulyHtfReadyRollupReport(report, options.outDir);
  if (options.json) {
    console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, openingDriveSelectorVerdict: report.openingDriveSelectorVerdict, blockers: report.blockers }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runRawOhlcScannerArtifactJulyHtfReadyRollupCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
