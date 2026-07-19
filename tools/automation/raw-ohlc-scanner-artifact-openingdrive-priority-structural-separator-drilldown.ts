import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  RawOhlcScannerArtifactOpeningDriveOosSourceInstalledSelectionReport,
} from './raw-ohlc-scanner-artifact-openingdrive-oos-source-installed-selection';
import type {
  RawOhlcScannerArtifactSameBarSeparatorDrilldownReport,
  RawOhlcScannerArtifactSameBarSeparatorRow,
} from './raw-ohlc-scanner-artifact-samebar-separator-drilldown';

interface CliOptions {
  sourceSelectionReports: string[];
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

interface EventRow {
  sourceSelectionReport: string;
  tradeDate: string;
  session: string;
  proofTime: string;
  direction: string;
  prioritySetupType: string;
  openingDriveTicketId: string;
  priorityTicketId: string;
  openingDriveOutcomeLabel: string;
  priorityOutcomeLabel: string;
  openingDriveOneMesPl: number | null;
  priorityOneMesPl: number | null;
  installedDeltaOneMesPl: number | null;
  openingDriveMfeR: number | null;
  priorityMfeR: number | null;
  openingDriveMaeR: number | null;
  priorityMaeR: number | null;
  openingDriveStopHitTime: string | null;
  priorityStopHitTime: string | null;
  openingDriveT1HitTime: string | null;
  priorityT1HitTime: string | null;
  openingDriveT2HitTime: string | null;
  priorityT2HitTime: string | null;
  openingDriveTags: string[];
  priorityTags: string[];
  priorityUnderperformed: boolean;
  priorityBetter: boolean;
  featureTags: string[];
}

interface FeatureRow {
  featureTag: string;
  rows: number;
  priorityUnderperformanceRows: number;
  priorityBetterRows: number;
  priorityEqualRows: number;
  separatorType: 'outcome_only' | 'mixed' | 'not_separator';
  liveInstallableNow: false;
}

export interface RawOhlcScannerArtifactOpeningDrivePriorityStructuralSeparatorDrilldownReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_structural_separator_drilldown';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: Authority;
  source: {
    sourceSelectionReports: string[];
  };
  assumptions: {
    consumesSavedSourceSelectionReportsOnly: true;
    consumesSavedSameBarReportsOnly: true;
    outcomeTimingIsResearchOnly: true;
    noLiveScoringUsed: true;
    noSetupScannerRun: true;
    livePromotionAllowed: false;
  };
  summary: {
    eventRows: number;
    priorityUnderperformanceRows: number;
    priorityBetterRows: number;
    pureUnderperformanceFeatureRows: number;
    liveInstallableFeatureRows: 0;
    livePromotionAllowedRows: 0;
    broadeningAllowedNow: false;
    recommendation: 'mine_pre_entry_structural_separator' | 'continue_observation' | 'fix_inputs';
  };
  featureRows: FeatureRow[];
  rows: EventRow[];
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

function matchingFiles(reportDir: string, pattern: RegExp): string[] {
  if (!fs.existsSync(reportDir)) return [];
  return fs.readdirSync(reportDir)
    .filter((name) => pattern.test(name))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(a).mtimeMs - fs.statSync(b).mtimeMs);
}

export function parseRawOhlcScannerArtifactOpeningDrivePriorityStructuralSeparatorDrilldownArgs(
  args = process.argv.slice(2),
): CliOptions {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const sourceSelectionReports = splitPaths(readFlag(args, '--source-selection-reports'));
  return {
    sourceSelectionReports: sourceSelectionReports.length
      ? sourceSelectionReports
      : matchingFiles(outDir, /^raw-ohlc-scanner-artifact-openingdrive-oos-source-installed-selection-\d+\.json$/),
    outDir,
    json: args.includes('--json'),
  };
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

function timeMs(value: string | null): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function samebarRowsByTicket(reports: RawOhlcScannerArtifactSameBarSeparatorDrilldownReport[]): Map<string, RawOhlcScannerArtifactSameBarSeparatorRow> {
  return new Map(reports.flatMap((report) => report.rows || []).map((row) => [row.ticketId, row]));
}

function featureTags(openingDrive: RawOhlcScannerArtifactSameBarSeparatorRow, priority: RawOhlcScannerArtifactSameBarSeparatorRow): string[] {
  const priorityT1 = timeMs(priority.t1HitTime);
  const openingDriveT1 = timeMs(openingDrive.t1HitTime);
  const priorityT2 = timeMs(priority.t2HitTime);
  const openingDriveT2 = timeMs(openingDrive.t2HitTime);
  return [
    `priority_outcome_${priority.outcomeLabel}`,
    `openingdrive_outcome_${openingDrive.outcomeLabel}`,
    priority.outcomeLabel === 'stopped_before_t1' && openingDrive.outcomeLabel === 'stopped_before_t1' ? 'both_stopped_before_t1' : null,
    priority.separatorTags.includes('intrabar_ambiguity') ? 'priority_intrabar_ambiguity' : null,
    openingDrive.separatorTags.includes('intrabar_ambiguity') ? 'openingdrive_intrabar_ambiguity' : null,
    priority.maeR !== null && priority.maeR >= 1 ? 'priority_mae_at_or_over_1r' : null,
    openingDrive.maeR !== null && openingDrive.maeR >= 1 ? 'openingdrive_mae_at_or_over_1r' : null,
    priority.mfeR !== null && priority.mfeR >= 2 ? 'priority_mfe_at_or_over_2r' : null,
    openingDrive.mfeR !== null && openingDrive.mfeR >= 2 ? 'openingdrive_mfe_at_or_over_2r' : null,
    priorityT1 !== null && openingDriveT1 !== null && priorityT1 > openingDriveT1 ? 'priority_t1_later_than_openingdrive' : null,
    priorityT2 !== null && openingDriveT2 !== null && priorityT2 > openingDriveT2 ? 'priority_t2_later_than_openingdrive' : null,
  ].filter((tag): tag is string => Boolean(tag));
}

function buildRows(loadedReports: Array<{
  path: string;
  report: RawOhlcScannerArtifactOpeningDriveOosSourceInstalledSelectionReport;
  samebarReports: RawOhlcScannerArtifactSameBarSeparatorDrilldownReport[];
}>): EventRow[] {
  return loadedReports.flatMap((loaded) => {
    const byTicket = samebarRowsByTicket(loaded.samebarReports);
    return loaded.report.rows.flatMap((row) => {
      if (!row.installedSelectedPriority) return [];
      const openingDrive = byTicket.get(row.openingDriveTicketId);
      const priority = byTicket.get(row.priorityTicketId);
      if (!openingDrive || !priority) return [];
      const installedDeltaOneMesPl = typeof row.deltaOneMesPl === 'number' ? row.deltaOneMesPl : null;
      return [{
        sourceSelectionReport: loaded.path,
        tradeDate: row.tradeDate,
        session: row.session,
        proofTime: row.proofTime,
        direction: row.direction,
        prioritySetupType: row.prioritySetupType,
        openingDriveTicketId: row.openingDriveTicketId,
        priorityTicketId: row.priorityTicketId,
        openingDriveOutcomeLabel: openingDrive.outcomeLabel,
        priorityOutcomeLabel: priority.outcomeLabel,
        openingDriveOneMesPl: openingDrive.resolvedOneMesPl,
        priorityOneMesPl: priority.resolvedOneMesPl,
        installedDeltaOneMesPl,
        openingDriveMfeR: openingDrive.mfeR,
        priorityMfeR: priority.mfeR,
        openingDriveMaeR: openingDrive.maeR,
        priorityMaeR: priority.maeR,
        openingDriveStopHitTime: openingDrive.stopHitTime,
        priorityStopHitTime: priority.stopHitTime,
        openingDriveT1HitTime: openingDrive.t1HitTime,
        priorityT1HitTime: priority.t1HitTime,
        openingDriveT2HitTime: openingDrive.t2HitTime,
        priorityT2HitTime: priority.t2HitTime,
        openingDriveTags: openingDrive.separatorTags,
        priorityTags: priority.separatorTags,
        priorityUnderperformed: typeof installedDeltaOneMesPl === 'number' && installedDeltaOneMesPl < 0,
        priorityBetter: typeof installedDeltaOneMesPl === 'number' && installedDeltaOneMesPl > 0,
        featureTags: featureTags(openingDrive, priority),
      }];
    });
  });
}

function buildFeatureRows(rows: EventRow[]): FeatureRow[] {
  const tags = [...new Set(rows.flatMap((row) => row.featureTags))].sort();
  return tags.map((featureTag) => {
    const matching = rows.filter((row) => row.featureTags.includes(featureTag));
    const priorityUnderperformanceRows = matching.filter((row) => row.priorityUnderperformed).length;
    const priorityBetterRows = matching.filter((row) => row.priorityBetter).length;
    const priorityEqualRows = matching.length - priorityUnderperformanceRows - priorityBetterRows;
    const separatorType: FeatureRow['separatorType'] = priorityUnderperformanceRows > 0 && priorityBetterRows === 0
      ? 'outcome_only'
      : priorityUnderperformanceRows > 0 ? 'mixed' : 'not_separator';
    return {
      featureTag,
      rows: matching.length,
      priorityUnderperformanceRows,
      priorityBetterRows,
      priorityEqualRows,
      separatorType,
      liveInstallableNow: false as const,
    };
  }).sort((a, b) => b.priorityUnderperformanceRows - a.priorityUnderperformanceRows || a.priorityBetterRows - b.priorityBetterRows || a.featureTag.localeCompare(b.featureTag));
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDrivePriorityStructuralSeparatorDrilldownReport, 'markdown'>): string {
  return [
    '# OpeningDrive Priority Structural Separator Drilldown',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only structural separator drilldown. Outcome timing and outcome labels are research-only and not live-installable. This does not run setupScanner, post Discord, write Supabase, read live bridge data, change scanner behavior, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Event rows: ${report.summary.eventRows}.`,
    `- Priority better / underperformed rows: ${report.summary.priorityBetterRows}/${report.summary.priorityUnderperformanceRows}.`,
    `- Pure underperformance feature rows: ${report.summary.pureUnderperformanceFeatureRows}.`,
    `- Live-installable feature rows: ${report.summary.liveInstallableFeatureRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Feature Rows',
    ...report.featureRows.map((row) => `- ${row.featureTag}: rows ${row.rows}, underperformed/better/equal ${row.priorityUnderperformanceRows}/${row.priorityBetterRows}/${row.priorityEqualRows}, type ${row.separatorType}, liveInstallableNow ${row.liveInstallableNow}.`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDrivePriorityStructuralSeparatorDrilldownReport(args: {
  sourceSelectionReports: string[];
  loadedReports: Array<{
    path: string;
    report: RawOhlcScannerArtifactOpeningDriveOosSourceInstalledSelectionReport;
    samebarReports: RawOhlcScannerArtifactSameBarSeparatorDrilldownReport[];
  }>;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDrivePriorityStructuralSeparatorDrilldownReport {
  const rows = buildRows(args.loadedReports);
  const featureRows = buildFeatureRows(rows);
  const blockers = [
    args.sourceSelectionReports.length === 0 ? 'no source-selection reports supplied' : null,
    args.loadedReports.some((loaded) => loaded.report.status !== 'pass') ? 'one or more source-selection reports did not pass' : null,
    args.loadedReports.some((loaded) => loaded.samebarReports.some((report) => report.status !== 'pass')) ? 'one or more same-bar reports did not pass' : null,
    rows.length === 0 ? 'no installed priority rows with matching same-bar rows found' : null,
  ].filter((item): item is string => Boolean(item));
  const pureUnderperformanceFeatureRows = featureRows.filter((row) => row.separatorType === 'outcome_only').length;
  const recommendation: RawOhlcScannerArtifactOpeningDrivePriorityStructuralSeparatorDrilldownReport['summary']['recommendation'] = blockers.length
    ? 'fix_inputs'
    : pureUnderperformanceFeatureRows > 0
      ? 'mine_pre_entry_structural_separator'
      : 'continue_observation';
  const base: Omit<RawOhlcScannerArtifactOpeningDrivePriorityStructuralSeparatorDrilldownReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_structural_separator_drilldown',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: { sourceSelectionReports: args.sourceSelectionReports },
    assumptions: {
      consumesSavedSourceSelectionReportsOnly: true,
      consumesSavedSameBarReportsOnly: true,
      outcomeTimingIsResearchOnly: true,
      noLiveScoringUsed: true,
      noSetupScannerRun: true,
      livePromotionAllowed: false,
    },
    summary: {
      eventRows: rows.length,
      priorityUnderperformanceRows: rows.filter((row) => row.priorityUnderperformed).length,
      priorityBetterRows: rows.filter((row) => row.priorityBetter).length,
      pureUnderperformanceFeatureRows,
      liveInstallableFeatureRows: 0,
      livePromotionAllowedRows: 0,
      broadeningAllowedNow: false,
      recommendation,
    },
    featureRows,
    rows,
    blockers,
    recommendations: recommendation === 'mine_pre_entry_structural_separator'
      ? [
        'Outcome-only separators explain the losing row but cannot be installed live.',
        'Next research pass should mine pre-entry or first-completed-bar structural features that approximate the outcome-only separator without lookahead.',
      ]
      : recommendation === 'continue_observation'
        ? ['No structural separator emerged from the saved rows; continue collecting fresh observations.']
        : ['Fix source inputs before interpreting structural separator output.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function loadSourceSelectionReport(filePath: string) {
  const report = readJson<RawOhlcScannerArtifactOpeningDriveOosSourceInstalledSelectionReport>(filePath);
  return {
    path: filePath,
    report,
    samebarReports: report.source.samebarReports.map((samebarPath) => readJson<RawOhlcScannerArtifactSameBarSeparatorDrilldownReport>(samebarPath)),
  };
}

function writeReport(report: RawOhlcScannerArtifactOpeningDrivePriorityStructuralSeparatorDrilldownReport, outDir: string): string {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-openingdrive-priority-structural-separator-drilldown-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(outDir, `${base}.md`), `${report.markdown}\n`, 'utf8');
  return jsonPath;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  const options = parseRawOhlcScannerArtifactOpeningDrivePriorityStructuralSeparatorDrilldownArgs();
  const report = buildRawOhlcScannerArtifactOpeningDrivePriorityStructuralSeparatorDrilldownReport({
    sourceSelectionReports: options.sourceSelectionReports,
    loadedReports: options.sourceSelectionReports.map(loadSourceSelectionReport),
  });
  const jsonPath = writeReport(report, options.outDir);
  if (options.json) console.log(JSON.stringify({ status: report.status, jsonPath, summary: report.summary, featureRows: report.featureRows, blockers: report.blockers }, null, 2));
  else { console.log(report.markdown); console.log(`\nWrote ${jsonPath}`); }
  if (report.status !== 'pass') process.exitCode = 1;
}
