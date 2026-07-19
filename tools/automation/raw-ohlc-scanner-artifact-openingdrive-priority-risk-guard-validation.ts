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
  openingDriveOneMesPl: number | null;
  priorityOneMesPl: number | null;
  installedDeltaOneMesPl: number | null;
  openingDriveRiskPoints: number;
  priorityRiskPoints: number;
  riskDeltaPoints: number;
  riskRatio: number | null;
  openingDriveOutcomeLabel: string;
  priorityOutcomeLabel: string;
  priorityUnderperformed: boolean;
  priorityBetter: boolean;
}

interface GuardRow {
  guardId: string;
  description: string;
  installedRows: number;
  keptPriorityRows: number;
  fallbackOpeningDriveRows: number;
  caughtUnderperformanceRows: number;
  missedUnderperformanceRows: number;
  falseRejectedPriorityBetterRows: number;
  installedPriorityOneMesPl: number | null;
  simulatedOneMesPl: number | null;
  simulatedDeltaVsInstalledPriority: number | null;
  decision: 'candidate_for_more_research' | 'reject_for_now';
}

type Guard = {
  guardId: string;
  description: string;
  keepPriority: (row: EventRow) => boolean;
};

export interface RawOhlcScannerArtifactOpeningDrivePriorityRiskGuardValidationReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_risk_guard_validation';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: Authority;
  source: {
    sourceSelectionReports: string[];
  };
  assumptions: {
    consumesSavedSourceSelectionReportsOnly: true;
    consumesSavedSameBarReportsOnly: true;
    noLiveScoringUsed: true;
    noSetupScannerRun: true;
    guardsAreResearchOnly: true;
    livePromotionAllowed: false;
  };
  summary: {
    eventRows: number;
    priorityUnderperformanceRows: number;
    priorityBetterRows: number;
    candidateGuardRows: number;
    installedPriorityOneMesPl: number | null;
    openingDriveOneMesPl: number | null;
    livePromotionAllowedRows: 0;
    broadeningAllowedNow: false;
    recommendation: 'no_simple_risk_guard_supported' | 'candidate_guard_needs_more_research' | 'fix_inputs';
  };
  guardRows: GuardRow[];
  rows: EventRow[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');

const GUARDS: Guard[] = [
  { guardId: 'priority_risk_lte_8', description: 'Keep priority only when priority risk <= 8 points.', keepPriority: (row) => row.priorityRiskPoints <= 8 },
  { guardId: 'priority_risk_lte_10', description: 'Keep priority only when priority risk <= 10 points.', keepPriority: (row) => row.priorityRiskPoints <= 10 },
  { guardId: 'priority_risk_lte_16', description: 'Keep priority only when priority risk <= 16 points.', keepPriority: (row) => row.priorityRiskPoints <= 16 },
  { guardId: 'priority_risk_lte_22', description: 'Keep priority only when priority risk <= 22 points.', keepPriority: (row) => row.priorityRiskPoints <= 22 },
  { guardId: 'risk_ratio_lte_1_5', description: 'Keep priority only when priority risk is <= 1.5x OpeningDrive risk.', keepPriority: (row) => row.riskRatio !== null && row.riskRatio <= 1.5 },
  { guardId: 'risk_ratio_lte_2', description: 'Keep priority only when priority risk is <= 2.0x OpeningDrive risk.', keepPriority: (row) => row.riskRatio !== null && row.riskRatio <= 2 },
  { guardId: 'risk_ratio_lte_3', description: 'Keep priority only when priority risk is <= 3.0x OpeningDrive risk.', keepPriority: (row) => row.riskRatio !== null && row.riskRatio <= 3 },
  { guardId: 'risk_delta_lte_4', description: 'Keep priority only when priority risk is no more than 4 points wider than OpeningDrive.', keepPriority: (row) => row.riskDeltaPoints <= 4 },
  { guardId: 'risk_delta_lte_5', description: 'Keep priority only when priority risk is no more than 5 points wider than OpeningDrive.', keepPriority: (row) => row.riskDeltaPoints <= 5 },
];

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

export function parseRawOhlcScannerArtifactOpeningDrivePriorityRiskGuardValidationArgs(
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

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function sum(values: Array<number | null>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? round(numeric.reduce((total, value) => total + value, 0)) : null;
}

function samebarRowsByTicket(reports: RawOhlcScannerArtifactSameBarSeparatorDrilldownReport[]): Map<string, RawOhlcScannerArtifactSameBarSeparatorRow> {
  return new Map(reports.flatMap((report) => report.rows || []).map((row) => [row.ticketId, row]));
}

function buildEventRows(args: {
  sourceSelectionReports: string[];
  loadedReports: Array<{
    path: string;
    report: RawOhlcScannerArtifactOpeningDriveOosSourceInstalledSelectionReport;
    samebarReports: RawOhlcScannerArtifactSameBarSeparatorDrilldownReport[];
  }>;
}): EventRow[] {
  return args.loadedReports.flatMap((loaded) => {
    const byTicket = samebarRowsByTicket(loaded.samebarReports);
    return loaded.report.rows.flatMap((row) => {
      if (!row.installedSelectedPriority) return [];
      const openingDrive = byTicket.get(row.openingDriveTicketId);
      const priority = byTicket.get(row.priorityTicketId);
      if (!openingDrive || !priority) return [];
      const riskRatio = openingDrive.riskPoints > 0 ? round(priority.riskPoints / openingDrive.riskPoints) : null;
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
        openingDriveOneMesPl: openingDrive.resolvedOneMesPl,
        priorityOneMesPl: priority.resolvedOneMesPl,
        installedDeltaOneMesPl,
        openingDriveRiskPoints: openingDrive.riskPoints,
        priorityRiskPoints: priority.riskPoints,
        riskDeltaPoints: round(priority.riskPoints - openingDrive.riskPoints),
        riskRatio,
        openingDriveOutcomeLabel: openingDrive.outcomeLabel,
        priorityOutcomeLabel: priority.outcomeLabel,
        priorityUnderperformed: typeof installedDeltaOneMesPl === 'number' && installedDeltaOneMesPl < 0,
        priorityBetter: typeof installedDeltaOneMesPl === 'number' && installedDeltaOneMesPl > 0,
      }];
    });
  });
}

function evaluateGuard(rows: EventRow[], guard: Guard): GuardRow {
  const keptRows = rows.filter(guard.keepPriority);
  const fallbackRows = rows.filter((row) => !guard.keepPriority(row));
  const simulatedOneMesPl = sum(rows.map((row) => guard.keepPriority(row) ? row.priorityOneMesPl : row.openingDriveOneMesPl));
  const installedPriorityOneMesPl = sum(rows.map((row) => row.priorityOneMesPl));
  const caughtUnderperformanceRows = fallbackRows.filter((row) => row.priorityUnderperformed).length;
  const missedUnderperformanceRows = keptRows.filter((row) => row.priorityUnderperformed).length;
  const falseRejectedPriorityBetterRows = fallbackRows.filter((row) => row.priorityBetter).length;
  const simulatedDeltaVsInstalledPriority = typeof simulatedOneMesPl === 'number' && typeof installedPriorityOneMesPl === 'number'
    ? round(simulatedOneMesPl - installedPriorityOneMesPl)
    : null;
  return {
    guardId: guard.guardId,
    description: guard.description,
    installedRows: rows.length,
    keptPriorityRows: keptRows.length,
    fallbackOpeningDriveRows: fallbackRows.length,
    caughtUnderperformanceRows,
    missedUnderperformanceRows,
    falseRejectedPriorityBetterRows,
    installedPriorityOneMesPl,
    simulatedOneMesPl,
    simulatedDeltaVsInstalledPriority,
    decision: caughtUnderperformanceRows > 0 &&
      missedUnderperformanceRows === 0 &&
      falseRejectedPriorityBetterRows === 0 &&
      typeof simulatedDeltaVsInstalledPriority === 'number' &&
      simulatedDeltaVsInstalledPriority >= 0
      ? 'candidate_for_more_research'
      : 'reject_for_now',
  };
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDrivePriorityRiskGuardValidationReport, 'markdown'>): string {
  return [
    '# OpeningDrive Priority Risk Guard Validation',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only risk-guard validation. It consumes saved source-selection and same-bar diagnostic reports only. It does not run setupScanner, post Discord, write Supabase, read live bridge data, change scanner behavior, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Event rows: ${report.summary.eventRows}.`,
    `- Priority better / underperformed rows: ${report.summary.priorityBetterRows}/${report.summary.priorityUnderperformanceRows}.`,
    `- Candidate guard rows: ${report.summary.candidateGuardRows}.`,
    `- One-MES P/L installed priority / OpeningDrive: ${report.summary.installedPriorityOneMesPl ?? '-'}/${report.summary.openingDriveOneMesPl ?? '-'}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Guard Rows',
    ...report.guardRows.map((row) => `- ${row.guardId}: kept/fallback ${row.keptPriorityRows}/${row.fallbackOpeningDriveRows}, caught/missed underperformance ${row.caughtUnderperformanceRows}/${row.missedUnderperformanceRows}, false-rejected priority winners ${row.falseRejectedPriorityBetterRows}, simulated delta ${row.simulatedDeltaVsInstalledPriority ?? '-'}, decision ${row.decision}.`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDrivePriorityRiskGuardValidationReport(args: {
  sourceSelectionReports: string[];
  loadedReports: Array<{
    path: string;
    report: RawOhlcScannerArtifactOpeningDriveOosSourceInstalledSelectionReport;
    samebarReports: RawOhlcScannerArtifactSameBarSeparatorDrilldownReport[];
  }>;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDrivePriorityRiskGuardValidationReport {
  const rows = buildEventRows(args);
  const guardRows = GUARDS.map((guard) => evaluateGuard(rows, guard));
  const blockers = [
    args.sourceSelectionReports.length === 0 ? 'no source-selection reports supplied' : null,
    args.loadedReports.some((loaded) => loaded.report.status !== 'pass') ? 'one or more source-selection reports did not pass' : null,
    args.loadedReports.some((loaded) => loaded.samebarReports.some((report) => report.status !== 'pass')) ? 'one or more same-bar reports did not pass' : null,
    rows.length === 0 ? 'no installed priority rows with matching same-bar rows found' : null,
  ].filter((item): item is string => Boolean(item));
  const candidateGuardRows = guardRows.filter((row) => row.decision === 'candidate_for_more_research').length;
  const recommendation: RawOhlcScannerArtifactOpeningDrivePriorityRiskGuardValidationReport['summary']['recommendation'] = blockers.length
    ? 'fix_inputs'
    : candidateGuardRows > 0
      ? 'candidate_guard_needs_more_research'
      : 'no_simple_risk_guard_supported';
  const base: Omit<RawOhlcScannerArtifactOpeningDrivePriorityRiskGuardValidationReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_risk_guard_validation',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: { sourceSelectionReports: args.sourceSelectionReports },
    assumptions: {
      consumesSavedSourceSelectionReportsOnly: true,
      consumesSavedSameBarReportsOnly: true,
      noLiveScoringUsed: true,
      noSetupScannerRun: true,
      guardsAreResearchOnly: true,
      livePromotionAllowed: false,
    },
    summary: {
      eventRows: rows.length,
      priorityUnderperformanceRows: rows.filter((row) => row.priorityUnderperformed).length,
      priorityBetterRows: rows.filter((row) => row.priorityBetter).length,
      candidateGuardRows,
      installedPriorityOneMesPl: sum(rows.map((row) => row.priorityOneMesPl)),
      openingDriveOneMesPl: sum(rows.map((row) => row.openingDriveOneMesPl)),
      livePromotionAllowedRows: 0,
      broadeningAllowedNow: false,
      recommendation,
    },
    guardRows,
    rows,
    blockers,
    recommendations: recommendation === 'no_simple_risk_guard_supported'
      ? [
        'Do not install a simple priority risk cap or risk-ratio guard from this evidence set.',
        'Next research pass should look for a structural separator beyond raw risk size, such as stop-hit timing, first adverse path, proof location, or target-delivery timing.',
      ]
      : recommendation === 'candidate_guard_needs_more_research'
        ? ['A guard candidate exists in this saved set, but it remains research-only until validated on fresh scanner artifacts.']
        : ['Fix source inputs before interpreting risk-guard validation.'],
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

function writeReport(report: RawOhlcScannerArtifactOpeningDrivePriorityRiskGuardValidationReport, outDir: string): string {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-openingdrive-priority-risk-guard-validation-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(outDir, `${base}.md`), `${report.markdown}\n`, 'utf8');
  return jsonPath;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  const options = parseRawOhlcScannerArtifactOpeningDrivePriorityRiskGuardValidationArgs();
  const report = buildRawOhlcScannerArtifactOpeningDrivePriorityRiskGuardValidationReport({
    sourceSelectionReports: options.sourceSelectionReports,
    loadedReports: options.sourceSelectionReports.map(loadSourceSelectionReport),
  });
  const jsonPath = writeReport(report, options.outDir);
  if (options.json) console.log(JSON.stringify({ status: report.status, jsonPath, summary: report.summary, guardRows: report.guardRows, blockers: report.blockers }, null, 2));
  else { console.log(report.markdown); console.log(`\nWrote ${jsonPath}`); }
  if (report.status !== 'pass') process.exitCode = 1;
}
