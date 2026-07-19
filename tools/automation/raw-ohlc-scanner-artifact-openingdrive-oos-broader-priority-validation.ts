import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  RawOhlcScannerArtifactSameBarSeparatorDrilldownReport,
  RawOhlcScannerArtifactSameBarSeparatorRow,
} from './raw-ohlc-scanner-artifact-samebar-separator-drilldown';
import type {
  RawOhlcScannerArtifactOpeningDriveOosReplayCollisionPackageReport,
} from './raw-ohlc-scanner-artifact-openingdrive-oos-replay-collision-package';

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

interface ValidationRow {
  tradeDate: string;
  session: string;
  proofTime: string;
  direction: string;
  openingDriveTicketId: string;
  openingDriveOneMesPl: number | null;
  openingDriveOutcomeLabel: string;
  priorityTicketId: string;
  prioritySetupType: string;
  priorityOneMesPl: number | null;
  priorityOutcomeLabel: string;
  deltaOneMesPl: number | null;
  verdict: 'priority_better' | 'openingdrive_better_or_equal' | 'missing_pl';
}

export interface RawOhlcScannerArtifactOpeningDriveOosBroaderPriorityValidationReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_oos_broader_priority_validation';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: Authority;
  source: {
    samebarReports: string[];
  };
  assumptions: {
    consumesExistingSameBarReportsOnly: true;
    sameEventOnly: true;
    sameDirectionOnly: true;
    comparesOpeningDriveAgainstSweepOrHtf: true;
    outcomeFieldsAreEvaluationOnly: true;
    noLiveScoringUsed: true;
    noSetupScannerRun: true;
    livePromotionAllowed: false;
  };
  summary: {
    comparableEvents: number;
    priorityBetterRows: number;
    openingDriveBetterOrEqualRows: number;
    openingDriveLosses: number;
    priorityLosses: number;
    openingDriveOneMesPl: number | null;
    priorityOneMesPl: number | null;
    deltaOneMesPl: number | null;
    livePromotionAllowedRows: 0;
    recommendation: 'prepare_research_only_live_proposal' | 'keep_researching_priority_filter' | 'fix_inputs';
  };
  rows: ValidationRow[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const PRIORITY_SET = new Set(['SweepMssFvgRetrace', 'HtfDisplacementMssContinuation']);

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function splitPaths(value: string | null): string[] {
  return (value || '').split(',').map((item) => item.trim()).filter(Boolean);
}

function latestMatchingFile(reportDir: string, pattern: RegExp): string | null {
  if (!fs.existsSync(reportDir)) return null;
  const matches = fs.readdirSync(reportDir)
    .filter((name) => pattern.test(name))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return matches[0] || null;
}

export function parseRawOhlcScannerArtifactOpeningDriveOosBroaderPriorityValidationArgs(args = process.argv.slice(2)): CliOptions {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const samebarReports = splitPaths(readFlag(args, '--samebar-reports'));
  return {
    samebarReports: samebarReports.length ? samebarReports : samebarReportsFromLatestOosPackage(outDir),
    outDir,
    json: args.includes('--json'),
  };
}

function samebarReportsFromLatestOosPackage(outDir: string): string[] {
  const latest = latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-openingdrive-oos-replay-collision-package-\d+\.json$/);
  if (!latest) return [];
  return readJson<RawOhlcScannerArtifactOpeningDriveOosReplayCollisionPackageReport>(latest).source?.samebarReports || [];
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

function sum(values: Array<number | null>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? round(numeric.reduce((total, value) => total + value, 0)) : null;
}

function isLoss(row: Pick<RawOhlcScannerArtifactSameBarSeparatorRow, 'outcomeStatus' | 'outcomeLabel'>): boolean {
  return row.outcomeStatus === 'resolved' && row.outcomeLabel === 'stopped_before_t1';
}

function sameEventKey(row: Pick<RawOhlcScannerArtifactSameBarSeparatorRow, 'tradeDate' | 'session' | 'proofTime' | 'direction'>): string {
  return `${row.tradeDate}|${row.session}|${row.proofTime}|${row.direction}`;
}

function bestByPl(rows: RawOhlcScannerArtifactSameBarSeparatorRow[]): RawOhlcScannerArtifactSameBarSeparatorRow | null {
  return rows
    .filter((row) => typeof row.resolvedOneMesPl === 'number' && Number.isFinite(row.resolvedOneMesPl))
    .sort((a, b) => (b.resolvedOneMesPl as number) - (a.resolvedOneMesPl as number))[0] || null;
}

function buildRows(reports: RawOhlcScannerArtifactSameBarSeparatorDrilldownReport[]): ValidationRow[] {
  const grouped = new Map<string, RawOhlcScannerArtifactSameBarSeparatorRow[]>();
  for (const row of reports.flatMap((report) => report.rows || [])) {
    grouped.set(sameEventKey(row), [...(grouped.get(sameEventKey(row)) || []), row]);
  }
  return [...grouped.values()].flatMap((rows) => {
    const bestOpeningDrive = bestByPl(rows.filter((row) => row.setupType === 'OpeningDriveFvgContinuation'));
    const bestPriority = bestByPl(rows.filter((row) => PRIORITY_SET.has(row.setupType)));
    if (!bestOpeningDrive || !bestPriority) return [];
    const delta = typeof bestPriority.resolvedOneMesPl === 'number' && typeof bestOpeningDrive.resolvedOneMesPl === 'number'
      ? round(bestPriority.resolvedOneMesPl - bestOpeningDrive.resolvedOneMesPl)
      : null;
    const verdict: ValidationRow['verdict'] = delta === null ? 'missing_pl' : delta > 0 ? 'priority_better' : 'openingdrive_better_or_equal';
    return [{
      tradeDate: bestOpeningDrive.tradeDate,
      session: bestOpeningDrive.session,
      proofTime: bestOpeningDrive.proofTime,
      direction: bestOpeningDrive.direction,
      openingDriveTicketId: bestOpeningDrive.ticketId,
      openingDriveOneMesPl: bestOpeningDrive.resolvedOneMesPl,
      openingDriveOutcomeLabel: bestOpeningDrive.outcomeLabel,
      priorityTicketId: bestPriority.ticketId,
      prioritySetupType: bestPriority.setupType,
      priorityOneMesPl: bestPriority.resolvedOneMesPl,
      priorityOutcomeLabel: bestPriority.outcomeLabel,
      deltaOneMesPl: delta,
      verdict,
    }];
  }).sort((a, b) => `${a.tradeDate}-${a.session}-${a.proofTime}-${a.direction}`.localeCompare(`${b.tradeDate}-${b.session}-${b.proofTime}-${b.direction}`));
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDriveOosBroaderPriorityValidationReport, 'markdown'>): string {
  return [
    '# OpeningDrive OOS Broader Priority Validation',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only broader priority validation over saved same-bar reports. It does not run setupScanner, post Discord, write Supabase, read live bridge data, change scanner behavior, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Comparable events: ${report.summary.comparableEvents}.`,
    `- Priority better / OpeningDrive better-or-equal: ${report.summary.priorityBetterRows}/${report.summary.openingDriveBetterOrEqualRows}.`,
    `- OpeningDrive losses / priority losses: ${report.summary.openingDriveLosses}/${report.summary.priorityLosses}.`,
    `- One-MES P/L OpeningDrive / priority / delta: ${report.summary.openingDriveOneMesPl ?? '-'}/${report.summary.priorityOneMesPl ?? '-'}/${report.summary.deltaOneMesPl ?? '-'}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDriveOosBroaderPriorityValidationReport(args: {
  samebarReports: string[];
  reports: RawOhlcScannerArtifactSameBarSeparatorDrilldownReport[];
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDriveOosBroaderPriorityValidationReport {
  const rows = buildRows(args.reports);
  const openingDriveOneMesPl = sum(rows.map((row) => row.openingDriveOneMesPl));
  const priorityOneMesPl = sum(rows.map((row) => row.priorityOneMesPl));
  const blockers = [
    args.samebarReports.length === 0 ? 'no same-bar reports supplied' : null,
    args.reports.some((report) => report.status !== 'pass') ? 'one or more same-bar reports did not pass' : null,
    rows.length === 0 ? 'no comparable OpeningDrive versus same-direction Sweep/HTF events found' : null,
  ].filter((item): item is string => Boolean(item));
  const priorityLosses = rows.filter((row) => row.priorityOutcomeLabel === 'stopped_before_t1').length;
  const recommendation: RawOhlcScannerArtifactOpeningDriveOosBroaderPriorityValidationReport['summary']['recommendation'] = blockers.length
    ? 'fix_inputs'
    : priorityLosses === 0 && rows.filter((row) => row.verdict === 'priority_better').length > rows.filter((row) => row.verdict === 'openingdrive_better_or_equal').length
      ? 'prepare_research_only_live_proposal'
      : 'keep_researching_priority_filter';
  const base: Omit<RawOhlcScannerArtifactOpeningDriveOosBroaderPriorityValidationReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_oos_broader_priority_validation',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: { samebarReports: args.samebarReports },
    assumptions: {
      consumesExistingSameBarReportsOnly: true,
      sameEventOnly: true,
      sameDirectionOnly: true,
      comparesOpeningDriveAgainstSweepOrHtf: true,
      outcomeFieldsAreEvaluationOnly: true,
      noLiveScoringUsed: true,
      noSetupScannerRun: true,
      livePromotionAllowed: false,
    },
    summary: {
      comparableEvents: rows.length,
      priorityBetterRows: rows.filter((row) => row.verdict === 'priority_better').length,
      openingDriveBetterOrEqualRows: rows.filter((row) => row.verdict === 'openingdrive_better_or_equal').length,
      openingDriveLosses: rows.filter((row) => isLoss({ outcomeStatus: 'resolved', outcomeLabel: row.openingDriveOutcomeLabel as RawOhlcScannerArtifactSameBarSeparatorRow['outcomeLabel'] })).length,
      priorityLosses,
      openingDriveOneMesPl,
      priorityOneMesPl,
      deltaOneMesPl: typeof openingDriveOneMesPl === 'number' && typeof priorityOneMesPl === 'number'
        ? round(priorityOneMesPl - openingDriveOneMesPl)
        : null,
      livePromotionAllowedRows: 0,
      recommendation,
    },
    rows,
    blockers,
    recommendations: recommendation === 'prepare_research_only_live_proposal'
      ? [
        'Prepare a research-only live proposal for same-event same-direction Sweep/HTF priority over OpeningDrive, with explicit disallowed inputs and rollback plan.',
        'Do not install scanner-visible ranking until the proposal is reviewed and explicitly approved.',
      ]
      : recommendation === 'keep_researching_priority_filter'
        ? ['Keep researching; broader validation did not yet justify a proposal.']
        : ['Fix same-bar input reports before using this validation.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function writeReport(report: RawOhlcScannerArtifactOpeningDriveOosBroaderPriorityValidationReport, outDir: string): string {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-openingdrive-oos-broader-priority-validation-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(outDir, `${base}.md`), `${report.markdown}\n`, 'utf8');
  return jsonPath;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  const options = parseRawOhlcScannerArtifactOpeningDriveOosBroaderPriorityValidationArgs();
  const report = buildRawOhlcScannerArtifactOpeningDriveOosBroaderPriorityValidationReport({
    samebarReports: options.samebarReports,
    reports: options.samebarReports.map((filePath) => readJson<RawOhlcScannerArtifactSameBarSeparatorDrilldownReport>(filePath)),
  });
  const jsonPath = writeReport(report, options.outDir);
  if (options.json) {
    console.log(JSON.stringify({ status: report.status, jsonPath, summary: report.summary, blockers: report.blockers }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nWrote ${jsonPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}
