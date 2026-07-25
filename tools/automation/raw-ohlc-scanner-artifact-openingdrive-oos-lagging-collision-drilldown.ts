import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  RawOhlcScannerArtifactOpeningDriveOosCollisionComparisonReport,
} from './raw-ohlc-scanner-artifact-openingdrive-oos-collision-comparison';
import type {
  RawOhlcScannerArtifactSameBarSeparatorDrilldownReport,
  RawOhlcScannerArtifactSameBarSeparatorRow,
} from './raw-ohlc-scanner-artifact-samebar-separator-drilldown';

interface CliOptions {
  comparison: string;
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

interface CandidateDetail {
  ticketId: string;
  setupType: string;
  direction: string;
  riskPoints: number;
  outcomeLabel: string;
  outcomeStatus: string;
  oneMesPl: number | null;
  mfeR: number | null;
  maeR: number | null;
  separatorTags: string[];
  isSelectedOpeningDrive: boolean;
  isBestCompetitor: boolean;
}

interface DrilldownRow {
  selectedTicketId: string;
  tradeDate: string;
  session: string;
  proofTime: string;
  selectedOneMesPl: number | null;
  bestCompetingTicketId: string | null;
  bestCompetingSetupType: string | null;
  bestCompetingOneMesPl: number | null;
  deltaVsBestCompeting: number | null;
  sameDirectionCompetitors: number;
  oppositeDirectionCompetitors: number;
  allCandidates: CandidateDetail[];
  likelySeparator: 'same_direction_higher_pl_competitor' | 'same_direction_sweep_or_htf_priority' | 'insufficient_detail';
}

export interface RawOhlcScannerArtifactOpeningDriveOosLaggingCollisionDrilldownReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_oos_lagging_collision_drilldown';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: Authority;
  source: {
    comparisonPath: string;
    samebarReports: string[];
  };
  assumptions: {
    consumesExistingComparisonOnly: true;
    consumesExistingSameBarReportsOnly: true;
    laggingRowsOnly: true;
    outcomeFieldsAreEvaluationOnly: true;
    noLiveScoringUsed: true;
    noSetupScannerRun: true;
    livePromotionAllowed: false;
  };
  summary: {
    laggingRows: number;
    laggingRowsWithSameDirectionCompetitors: number;
    laggingRowsBestedBySweepOrHtf: number;
    selectedOneMesPl: number | null;
    bestCompetingOneMesPl: number | null;
    deltaVsBestCompetingOneMesPl: number | null;
    livePromotionAllowedRows: 0;
    recommendation: 'research_sweep_htf_priority_over_openingdrive_same_event' | 'fix_inputs' | 'keep_observing';
  };
  rows: DrilldownRow[];
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

function latestMatchingFile(reportDir: string, pattern: RegExp): string | null {
  if (!fs.existsSync(reportDir)) return null;
  const matches = fs.readdirSync(reportDir)
    .filter((name) => pattern.test(name))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return matches[0] || null;
}

function splitPaths(value: string | null): string[] {
  return (value || '').split(',').map((item) => item.trim()).filter(Boolean);
}

export function parseRawOhlcScannerArtifactOpeningDriveOosLaggingCollisionDrilldownArgs(args = process.argv.slice(2)): CliOptions {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const comparison = readFlag(args, '--comparison') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-openingdrive-oos-collision-comparison-\d+\.json$/);
  if (!comparison) throw new Error('--comparison is required.');
  const samebarReports = splitPaths(readFlag(args, '--samebar-reports'));
  return {
    comparison,
    samebarReports: samebarReports.length ? samebarReports : samebarReportsFromComparison(comparison),
    outDir,
    json: args.includes('--json'),
  };
}

function samebarReportsFromComparison(comparisonPath: string): string[] {
  if (!fs.existsSync(comparisonPath)) return [];
  return readJson<RawOhlcScannerArtifactOpeningDriveOosCollisionComparisonReport>(comparisonPath).source?.samebarReports || [];
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

function sameEventKey(row: Pick<RawOhlcScannerArtifactSameBarSeparatorRow, 'tradeDate' | 'session' | 'proofTime'>): string {
  return `${row.tradeDate}|${row.session}|${row.proofTime}`;
}

function detail(row: RawOhlcScannerArtifactSameBarSeparatorRow, selectedTicketId: string, bestCompetingTicketId: string | null): CandidateDetail {
  return {
    ticketId: row.ticketId,
    setupType: row.setupType,
    direction: row.direction,
    riskPoints: row.riskPoints,
    outcomeLabel: row.outcomeLabel,
    outcomeStatus: row.outcomeStatus,
    oneMesPl: row.resolvedOneMesPl,
    mfeR: row.mfeR,
    maeR: row.maeR,
    separatorTags: row.separatorTags,
    isSelectedOpeningDrive: row.ticketId === selectedTicketId,
    isBestCompetitor: row.ticketId === bestCompetingTicketId,
  };
}

function likelySeparator(details: CandidateDetail[], selectedTicketId: string): DrilldownRow['likelySeparator'] {
  const selected = details.find((row) => row.ticketId === selectedTicketId);
  if (!selected) return 'insufficient_detail';
  const betterSameDirection = details.filter((row) => (
    !row.isSelectedOpeningDrive &&
    row.direction === selected.direction &&
    typeof row.oneMesPl === 'number' &&
    typeof selected.oneMesPl === 'number' &&
    row.oneMesPl > selected.oneMesPl
  ));
  if (!betterSameDirection.length) return 'insufficient_detail';
  if (betterSameDirection.some((row) => row.setupType === 'SweepMssFvgRetrace' || row.setupType === 'IntradayMssMicroContinuation')) {
    return 'same_direction_sweep_or_htf_priority';
  }
  return 'same_direction_higher_pl_competitor';
}

function buildRows(args: {
  comparison: RawOhlcScannerArtifactOpeningDriveOosCollisionComparisonReport | null;
  samebarReports: RawOhlcScannerArtifactSameBarSeparatorDrilldownReport[];
}): DrilldownRow[] {
  const allSamebarRows = args.samebarReports.flatMap((report) => report.rows || []);
  const rowsByEvent = new Map<string, RawOhlcScannerArtifactSameBarSeparatorRow[]>();
  for (const row of allSamebarRows) rowsByEvent.set(sameEventKey(row), [...(rowsByEvent.get(sameEventKey(row)) || []), row]);
  return (args.comparison?.rows || [])
    .filter((row) => row.collisionVerdict === 'selected_clean_but_competitor_better')
    .map((row) => {
      const eventRows = rowsByEvent.get(`${row.tradeDate}|${row.session}|${row.proofTime}`) || [];
      const details = eventRows
        .map((candidate) => detail(candidate, row.selectedTicketId, row.bestCompetingTicketId))
        .sort((a, b) => (b.oneMesPl ?? -Infinity) - (a.oneMesPl ?? -Infinity));
      return {
        selectedTicketId: row.selectedTicketId,
        tradeDate: row.tradeDate,
        session: row.session,
        proofTime: row.proofTime,
        selectedOneMesPl: row.selectedOneMesPl,
        bestCompetingTicketId: row.bestCompetingTicketId,
        bestCompetingSetupType: row.bestCompetingSetupType,
        bestCompetingOneMesPl: row.bestCompetingOneMesPl,
        deltaVsBestCompeting: row.selectedVsBestCompetingDelta,
        sameDirectionCompetitors: details.filter((candidate) => !candidate.isSelectedOpeningDrive && candidate.direction === row.selectedDirection).length,
        oppositeDirectionCompetitors: details.filter((candidate) => !candidate.isSelectedOpeningDrive && candidate.direction !== row.selectedDirection).length,
        allCandidates: details,
        likelySeparator: likelySeparator(details, row.selectedTicketId),
      };
    });
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDriveOosLaggingCollisionDrilldownReport, 'markdown'>): string {
  return [
    '# OpeningDrive OOS Lagging Collision Drilldown',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only lagging-collision drilldown over saved comparison and same-bar reports. It does not run setupScanner, post Discord, write Supabase, read live bridge data, change scanner behavior, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Lagging rows: ${report.summary.laggingRows}.`,
    `- Same-direction competitor rows: ${report.summary.laggingRowsWithSameDirectionCompetitors}.`,
    `- Bested by Sweep/HTF rows: ${report.summary.laggingRowsBestedBySweepOrHtf}.`,
    `- One-MES P/L selected / best-competing / delta: ${report.summary.selectedOneMesPl ?? '-'}/${report.summary.bestCompetingOneMesPl ?? '-'}/${report.summary.deltaVsBestCompetingOneMesPl ?? '-'}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Lagging Rows',
    '| Time | Selected P/L | Best Setup | Best P/L | Delta | Same Dir | Opp Dir | Separator |',
    '|---|---:|---|---:|---:|---:|---:|---|',
    ...report.rows.map((row) => `| ${row.proofTime} | ${row.selectedOneMesPl ?? '-'} | ${escapeTable(row.bestCompetingSetupType || '-')} | ${row.bestCompetingOneMesPl ?? '-'} | ${row.deltaVsBestCompeting ?? '-'} | ${row.sameDirectionCompetitors} | ${row.oppositeDirectionCompetitors} | ${row.likelySeparator} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDriveOosLaggingCollisionDrilldownReport(args: {
  comparisonPath: string;
  comparison: RawOhlcScannerArtifactOpeningDriveOosCollisionComparisonReport | null;
  samebarReports: string[];
  samebarReportPayloads: RawOhlcScannerArtifactSameBarSeparatorDrilldownReport[];
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDriveOosLaggingCollisionDrilldownReport {
  const rows = buildRows({ comparison: args.comparison, samebarReports: args.samebarReportPayloads });
  const blockers = [
    !args.comparison ? 'missing comparison report' : null,
    args.comparison && args.comparison.status !== 'pass' ? `comparison status ${args.comparison.status}` : null,
    args.samebarReportPayloads.length === 0 ? 'missing same-bar reports' : null,
    args.samebarReportPayloads.some((report) => report.status !== 'pass') ? 'one or more same-bar reports did not pass' : null,
    rows.length === 0 ? 'no lagging OpeningDrive rows found' : null,
  ].filter((item): item is string => Boolean(item));
  const selectedOneMesPl = sum(rows.map((row) => row.selectedOneMesPl));
  const bestCompetingOneMesPl = sum(rows.map((row) => row.bestCompetingOneMesPl));
  const bestedBySweepOrHtf = rows.filter((row) => row.likelySeparator === 'same_direction_sweep_or_htf_priority').length;
  const recommendation: RawOhlcScannerArtifactOpeningDriveOosLaggingCollisionDrilldownReport['summary']['recommendation'] = blockers.length
    ? 'fix_inputs'
    : bestedBySweepOrHtf > 0
      ? 'research_sweep_htf_priority_over_openingdrive_same_event'
      : 'keep_observing';
  const base: Omit<RawOhlcScannerArtifactOpeningDriveOosLaggingCollisionDrilldownReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_oos_lagging_collision_drilldown',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      comparisonPath: args.comparisonPath,
      samebarReports: args.samebarReports,
    },
    assumptions: {
      consumesExistingComparisonOnly: true,
      consumesExistingSameBarReportsOnly: true,
      laggingRowsOnly: true,
      outcomeFieldsAreEvaluationOnly: true,
      noLiveScoringUsed: true,
      noSetupScannerRun: true,
      livePromotionAllowed: false,
    },
    summary: {
      laggingRows: rows.length,
      laggingRowsWithSameDirectionCompetitors: rows.filter((row) => row.sameDirectionCompetitors > 0).length,
      laggingRowsBestedBySweepOrHtf: bestedBySweepOrHtf,
      selectedOneMesPl,
      bestCompetingOneMesPl,
      deltaVsBestCompetingOneMesPl: typeof selectedOneMesPl === 'number' && typeof bestCompetingOneMesPl === 'number'
        ? round(selectedOneMesPl - bestCompetingOneMesPl)
        : null,
      livePromotionAllowedRows: 0,
      recommendation,
    },
    rows,
    blockers,
    recommendations: recommendation === 'research_sweep_htf_priority_over_openingdrive_same_event'
      ? [
        'Research a same-event priority rule where clean same-direction SweepMssFvgRetrace or IntradayMssMicroContinuation outranks OpeningDrive when both are present.',
        'Keep this research-only until validated out of sample; do not remove OpeningDrive or broaden model behavior from this drilldown alone.',
      ]
      : recommendation === 'keep_observing'
        ? ['Keep observing; no recurring lagging separator was found in this slice.']
        : ['Fix comparison or same-bar inputs before using this drilldown.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function writeReport(report: RawOhlcScannerArtifactOpeningDriveOosLaggingCollisionDrilldownReport, outDir: string): string {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-openingdrive-oos-lagging-collision-drilldown-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(outDir, `${base}.md`), `${report.markdown}\n`, 'utf8');
  return jsonPath;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  const options = parseRawOhlcScannerArtifactOpeningDriveOosLaggingCollisionDrilldownArgs();
  const report = buildRawOhlcScannerArtifactOpeningDriveOosLaggingCollisionDrilldownReport({
    comparisonPath: options.comparison,
    comparison: fs.existsSync(options.comparison)
      ? readJson<RawOhlcScannerArtifactOpeningDriveOosCollisionComparisonReport>(options.comparison)
      : null,
    samebarReports: options.samebarReports,
    samebarReportPayloads: options.samebarReports.map((filePath) => readJson<RawOhlcScannerArtifactSameBarSeparatorDrilldownReport>(filePath)),
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
